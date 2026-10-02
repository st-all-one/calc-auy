//! Diagnóstico transversal: log estruturado + métrica de tempo.
//!
//! Regras do projeto:
//!
//! - **Logs sempre estruturados**: um registo é um **identificador estável** (do catálogo
//!   [`events`]) + **campos tipados**; nunca texto livre interpolado.
//! - **Custo zero por defeito**: sem `feature = "instrument"`, `span!` e `event!` são *no-op*.
//! - **On-demand**: com a feature, liga-se em runtime (`CALC_AUY_INSTRUMENT=1`).

pub mod events;
pub mod fingerprint;
pub mod redact;

/// Nível de diagnóstico, do mais grave (`Error`) ao mais verboso (`Trace`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Level {
    /// Erro.
    Error,
    /// Aviso.
    Warn,
    /// Informação.
    Info,
    /// Debug.
    Debug,
    /// Trace.
    Trace,
}

/// Valor de um campo estruturado (sem alocação).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Value<'a> {
    /// String.
    Str(&'a str),
    /// Inteiro com sinal.
    Int(i64),
    /// Inteiro sem sinal.
    Uint(u64),
    /// Booleano.
    Bool(bool),
}

impl<'a> From<&'a str> for Value<'a> {
    fn from(value: &'a str) -> Self {
        Self::Str(value)
    }
}

impl From<i32> for Value<'_> {
    fn from(value: i32) -> Self {
        Self::Int(i64::from(value))
    }
}

impl From<u64> for Value<'_> {
    fn from(value: u64) -> Self {
        Self::Uint(value)
    }
}

impl From<usize> for Value<'_> {
    fn from(value: usize) -> Self {
        Self::Uint(u64::try_from(value).unwrap_or(u64::MAX))
    }
}

impl From<bool> for Value<'_> {
    fn from(value: bool) -> Self {
        Self::Bool(value)
    }
}

/// Span de instrumentação.
#[derive(Debug)]
pub struct Span {
    level: Level,
    event: &'static str,
}

impl Span {
    /// Cria um novo span (quando a feature está ativa).
    #[cfg(feature = "instrument")]
    pub fn start(level: Level, event: &'static str, fields: &[(&str, Value<'_>)]) -> Self {
        tracing::event!(
            target: event,
            level: match level {
                Level::Error => tracing::Level::ERROR,
                Level::Warn => tracing::Level::WARN,
                Level::Info => tracing::Level::INFO,
                Level::Debug => tracing::Level::DEBUG,
                Level::Trace => tracing::Level::TRACE,
            },
            "{event}",
        );
        let _ = fields; // campos seriam emitidos aqui
        Self { level, event }
    }

    /// Cria um span de função (quando a feature está ativa).
    #[cfg(feature = "instrument")]
    pub fn start_function(
        level: Level,
        event: &'static str,
        function: &str,
        fields: &[(&str, Value<'_>)],
    ) -> Self {
        tracing::event!(
            target: event,
            level: match level {
                Level::Error => tracing::Level::ERROR,
                Level::Warn => tracing::Level::WARN,
                Level::Info => tracing::Level::INFO,
                Level::Debug => tracing::Level::DEBUG,
                Level::Trace => tracing::Level::TRACE,
            },
            "{function}",
        );
        let _ = fields;
        Self { level, event }
    }

    /// Cria um span no-op (quando a feature está desligada).
    #[cfg(not(feature = "instrument"))]
    #[must_use]
    pub const fn noop(level: Level, event: &'static str) -> Self {
        Self { level, event }
    }
}

impl Drop for Span {
    fn drop(&mut self) {
        // Span fechado
        let _ = self.level;
        let _ = self.event;
    }
}

/// Emite um evento estruturado (quando a feature está ativa).
#[cfg(feature = "instrument")]
pub fn record(level: Level, event: &'static str, fields: &[(&str, Value<'_>)]) {
    tracing::event!(
        target: event,
        level: match level {
            Level::Error => tracing::Level::ERROR,
            Level::Warn => tracing::Level::WARN,
            Level::Info => tracing::Level::INFO,
            Level::Debug => tracing::Level::DEBUG,
            Level::Trace => tracing::Level::TRACE,
        },
        "{event}",
    );
    let _ = fields;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn level_ordering() {
        assert!(Level::Error < Level::Warn);
        assert!(Level::Warn < Level::Info);
        assert!(Level::Info < Level::Debug);
        assert!(Level::Debug < Level::Trace);
    }

    #[test]
    fn value_conversions() {
        let v: Value<'_> = "test".into();
        assert_eq!(v, Value::Str("test"));

        let v: Value<'_> = 42u64.into();
        assert_eq!(v, Value::Uint(42));

        let v: Value<'_> = true.into();
        assert_eq!(v, Value::Bool(true));
    }
}
