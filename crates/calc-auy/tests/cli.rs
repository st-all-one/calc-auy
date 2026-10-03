//! Testes de integração da CLI `calc-auy`.

use std::io::Write;
use std::process::{Command, Stdio};

/// Cria o comando do binário.
fn bin() -> Command {
    Command::new(env!("CARGO_BIN_EXE_calc-auy"))
}

/// Executa o binário e devolve `(código, stdout, stderr)`.
fn run(args: &[&str]) -> (i32, String, String) {
    let output = bin().args(args).output().expect("executar");
    (
        output.status.code().unwrap_or(-1),
        String::from_utf8_lossy(&output.stdout).to_string(),
        String::from_utf8_lossy(&output.stderr).to_string(),
    )
}

/// Executa lendo o corpo da entrada padrão.
fn run_stdin(args: &[&str], input: &str) -> (i32, String, String) {
    let mut child = bin()
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("spawn");
    {
        let mut stdin = child.stdin.take().expect("stdin");
        stdin.write_all(input.as_bytes()).expect("escrever stdin");
    }
    let output = child.wait_with_output().expect("wait");
    (
        output.status.code().unwrap_or(-1),
        String::from_utf8_lossy(&output.stdout).to_string(),
        String::from_utf8_lossy(&output.stderr).to_string(),
    )
}

#[test]
fn help_lists_subcommands() {
    let (code, stdout, _) = run(&["--help"]);
    assert_eq!(code, 0);
    for command in ["verify", "hydrate", "repl", "schema", "man"] {
        assert!(stdout.contains(command), "faltou {command}");
    }
}

#[test]
fn format_is_the_default() {
    let (code, stdout, _) = run(&["10000 * (1 + 14.75%) ^ 3"]);
    assert_eq!(code, 0);
    assert_eq!(stdout.trim(), "15109.78");
}

#[test]
fn body_defaults_to_stdin() {
    let (code, stdout, _) = run_stdin(&[], "1 + 2 * 3\n");
    assert_eq!(code, 0);
    assert_eq!(stdout.trim(), "7.00");
}

#[test]
fn params_select_mode() {
    let (code, stdout, _) = run(&[
        "--params",
        "{\"mode\":\"monetary\"}",
        "10000 * (1 + 14.75%) ^ 3",
    ]);
    assert_eq!(code, 0);
    assert_eq!(stdout.trim(), "R$\u{00a0}15.109,78");
}

#[test]
fn params_select_verbal_mode() {
    let (code, stdout, _) = run(&[
        "--params",
        "{\"mode\":\"verbal\",\"locale\":\"zh-CN\"}",
        "1 + 2",
    ]);
    assert_eq!(code, 0);
    assert!(stdout.contains("一 加 二"), "stdout: {stdout}");
    assert!(stdout.contains("三"), "stdout: {stdout}");
}

#[test]
fn params_select_json_mode() {
    let (code, stdout, _) = run(&["--params", "{\"mode\":\"json\"}", "1 + 2"]);
    assert_eq!(code, 0);
    assert!(stdout.contains("\"decimal\":\"3.00\""), "stdout: {stdout}");
    assert!(stdout.contains("\"signature\":"), "stdout: {stdout}");
}

#[test]
#[cfg(feature = "render")]
fn params_select_html_mode() {
    let (code, stdout, _) = run(&["--params", "{\"mode\":\"html\"}", "1/2 + 3"]);
    assert_eq!(code, 0);
    assert!(stdout.contains("calc-auy-result"), "stdout: {stdout}");
    assert!(stdout.contains("aria-label="), "stdout: {stdout}");
}

#[test]
#[cfg(feature = "render")]
fn params_select_svg_mode() {
    let (code, stdout, _) = run(&["--params", "{\"mode\":\"svg\"}", "1/2 + 3"]);
    assert_eq!(code, 0);
    assert!(stdout.contains("<svg"), "stdout: {stdout}");
}

#[test]
fn params_op_commit_then_verify() {
    let (code, trace, _) = run(&["--params", "{\"op\":\"commit\"}", "1 + 2"]);
    assert_eq!(code, 0);
    let (code, verdict, _) = run(&["verify", trace.trim()]);
    assert_eq!(code, 0);
    assert_eq!(verdict.trim(), "true");
}

#[test]
fn params_op_sign_is_deterministic() {
    let (_, first, _) = run(&["--params", "{\"op\":\"sign\"}", "7 * 6"]);
    let (_, second, _) = run(&["--params", "{\"op\":\"sign\"}", "7 * 6"]);
    assert_eq!(first, second);
    assert_eq!(first.trim().len(), 64);
}

#[test]
fn hydrate_subcommand() {
    let (code, trace, _) = run(&["--params", "{\"op\":\"commit\"}", "1 + 2"]);
    assert_eq!(code, 0);
    let trace: serde_json::Value = serde_json::from_str(trace.trim()).expect("trace");
    let ast = serde_json::to_string(&trace["payload"]["ast"]).expect("ast");
    let (code, normalized, _) = run(&["hydrate", &ast]);
    assert_eq!(code, 0);
    let value: serde_json::Value = serde_json::from_str(normalized.trim()).expect("normalized");
    assert_eq!(value["op_type"], "add");
}

#[test]
fn division_by_zero_exit_code() {
    let (code, _, stderr) = run(&["1 / 0"]);
    assert_eq!(code, 5);
    assert!(stderr.contains("divisão por zero"));
}

#[test]
fn json_error_format_via_params() {
    let (code, stdout, _) = run(&["--params", "{\"error_format\":\"json\"}", "1 / 0"]);
    assert_eq!(code, 5);
    let problem: serde_json::Value = serde_json::from_str(stdout.trim()).expect("problem");
    assert_eq!(problem["status"], 400);
    let kind = problem["type"].as_str().expect("type");
    assert!(kind.contains("division-by-zero"), "{kind}");
}

#[test]
fn deterministic_clock_is_reproducible() {
    let params = "{\"error_format\":\"json\",\"deterministic\":true}";
    let (_, first, _) = run(&["--params", params, "1 / 0"]);
    let (_, second, _) = run(&["--params", params, "1 / 0"]);
    let first: serde_json::Value = serde_json::from_str(first.trim()).expect("first");
    let second: serde_json::Value = serde_json::from_str(second.trim()).expect("second");
    assert_eq!(first["instance"], second["instance"]);
}

#[test]
fn env_fallback_for_decimals() {
    let output = bin()
        .env("CALC_AUY_DECIMALS", "4")
        .arg("1/3")
        .output()
        .expect("env");
    assert_eq!(String::from_utf8_lossy(&output.stdout).trim(), "0.3333");
}

#[test]
fn params_and_batch_are_exclusive() {
    let (code, _, stderr) = run(&["--params", "{}", "--batch"]);
    assert_eq!(code, 2);
    assert!(stderr.contains("mutuamente exclusivos"));
}

#[test]
fn unknown_param_field_is_rejected() {
    let (code, _, stderr) = run(&["--params", "{\"foo\":1}", "1+2"]);
    assert_eq!(code, 2);
    assert!(stderr.contains("foo"));
}

#[test]
fn batch_preserves_order_and_reports_errors() {
    let input = concat!(
        "{\"id\":1,\"body\":\"1+1\"}\n",
        "{\"id\":2,\"body\":\"1/0\"}\n",
        "{\"id\":3,\"body\":\"10000*(1+14.75%)^3\",\"params\":{\"mode\":\"monetary\"}}\n",
    );
    let (code, stdout, _) = run_stdin(&["--batch"], input);
    assert_eq!(code, 0);
    let lines: Vec<serde_json::Value> = stdout
        .lines()
        .map(|line| serde_json::from_str(line).expect("json"))
        .collect();
    assert_eq!(lines.len(), 3);
    assert_eq!(lines[0]["id"], 1);
    assert_eq!(lines[0]["result"], "2.00");
    assert_eq!(lines[1]["id"], 2);
    assert_eq!(lines[1]["ok"], false);
    assert_eq!(lines[2]["id"], 3);
    assert_eq!(lines[2]["result"], "R$\u{00a0}15.109,78");
}

#[test]
fn schema_output() {
    let (code, stdout, _) = run(&["schema"]);
    assert_eq!(code, 0);
    let schema: serde_json::Value = serde_json::from_str(stdout.trim()).expect("schema");
    assert_eq!(schema["trace_version"], 1);
    assert_eq!(schema["payload"], "SignaturePayload");
}

#[test]
fn man_and_completions() {
    let (code, stdout, _) = run(&["man"]);
    assert_eq!(code, 0);
    assert!(stdout.starts_with(".TH CALC-AUY 1"));

    let (code, stdout, _) = run(&["man", "--completions", "bash"]);
    assert_eq!(code, 0);
    assert!(stdout.contains("complete -F _calc_auy calc-auy"));
}
