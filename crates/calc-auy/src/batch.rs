//! Processamento NDJSON em lote: ordem preservada e memória limitada (ADR-010).
//!
//! Produtor (stdin) → canal limitado → pool `rayon` → coletor ordenado →
//! escritor (stdout). Cada linha é `{"id"?, "body", "params"?}`, alinhada ao
//! `--params`; a resposta é `{"id", "ok", ...}`.

use std::io::{BufRead, BufWriter, Write};
use std::sync::mpsc::{Receiver, SyncSender, sync_channel};
use std::thread;

use anyhow::{Context, Result};
use calc_auy_api::{CalcAuyError, Clock, MockClock};
use rayon::iter::{IntoParallelRefIterator, ParallelIterator};
use serde::Deserialize;

use crate::commands::dispatch;
use crate::config::{Params, Settings};

/// Capacidade padrão do canal limitado.
const DEFAULT_BUFFER: usize = 256;

/// Requisição de uma linha NDJSON.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct BatchRequest {
    /// Identificador ecoado na resposta.
    #[serde(default)]
    id: serde_json::Value,
    /// Corpo da operação.
    body: String,
    /// Parâmetros por item (sobrepõem a base).
    #[serde(default)]
    params: Params,
}

/// Executa o processamento em lote.
///
/// # Errors
///
/// Retorna erro se a leitura, a escrita ou a thread produtora falharem.
pub(crate) fn run(base: &Settings) -> Result<()> {
    let buffer = buffer_size();
    let clock = MockClock::new();
    let (sender, receiver) = sync_channel::<String>(buffer);
    let reader = thread::spawn(move || feed(&sender));

    let stdout = std::io::stdout();
    let mut writer = BufWriter::new(stdout.lock());
    loop {
        let chunk = collect_chunk(&receiver, buffer);
        if chunk.is_empty() {
            break;
        }
        let rendered: Vec<String> = chunk
            .par_iter()
            .map(|line| process_line(base, line, &clock))
            .collect();
        for line in rendered.into_iter().filter(|line| !line.is_empty()) {
            writeln!(writer, "{line}").context("falha ao escrever a saída padrão")?;
        }
    }
    writer
        .flush()
        .context("falha ao descarregar a saída padrão")?;
    reader
        .join()
        .map_err(|_| anyhow::anyhow!("thread produtora falhou"))??;
    Ok(())
}

/// Tamanho do canal limitado (`CALC_AUY_BATCH_BUFFER`, padrão 256).
fn buffer_size() -> usize {
    std::env::var("CALC_AUY_BATCH_BUFFER")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(DEFAULT_BUFFER)
        .max(1)
}

/// Alimenta o canal limitado com as linhas da entrada padrão.
///
/// # Errors
///
/// Retorna erro se a entrada padrão não puder ser lida.
fn feed(sender: &SyncSender<String>) -> Result<()> {
    let stdin = std::io::stdin();
    for line in stdin.lock().lines() {
        let line = line.context("falha ao ler a entrada padrão")?;
        if sender.send(line).is_err() {
            return Ok(());
        }
    }
    Ok(())
}

/// Coleta até `buffer` itens do canal, na ordem de chegada.
fn collect_chunk(receiver: &Receiver<String>, buffer: usize) -> Vec<String> {
    let mut chunk = Vec::with_capacity(buffer);
    if let Ok(line) = receiver.recv() {
        chunk.push(line);
    }
    while chunk.len() < buffer {
        match receiver.try_recv() {
            Ok(line) => chunk.push(line),
            Err(_) => break,
        }
    }
    chunk
}

/// Processa uma linha NDJSON e devolve a linha de saída.
fn process_line(base: &Settings, line: &str, clock: &dyn Clock) -> String {
    if line.trim().is_empty() {
        return String::new();
    }
    let request: BatchRequest = match serde_json::from_str(line) {
        Ok(request) => request,
        Err(error) => {
            let error = CalcAuyError::InvalidInput {
                message: error.to_string(),
            };
            return problem_line(&serde_json::Value::Null, &error, clock);
        }
    };
    let mut settings = base.clone();
    settings.apply(&request.params);
    match dispatch(&settings, &request.body) {
        Ok(output) => output.to_json(&request.id),
        Err(error) => problem_line(&request.id, &error, clock),
    }
}

/// Monta a linha de erro (`ProblemDetails`).
fn problem_line(id: &serde_json::Value, error: &CalcAuyError, clock: &dyn Clock) -> String {
    let problem = error.to_problem_details(clock);
    serde_json::json!({
        "id": id,
        "ok": false,
        "problem": problem,
    })
    .to_string()
}
