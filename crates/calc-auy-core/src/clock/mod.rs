//! Port de tempo para determinismo.
//!
//! O [`Clock`] abstrai o tempo de modo que testes sejam determinísticos.
//! Em produção, usa-se [`SystemClock`]; em testes, [`MockClock`].

use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};
use uuid::Uuid;

/// Trait de relógio para operações que dependem de tempo.
///
/// Implementações devem ser `Send + Sync` para uso em contextos multithread.
pub trait Clock: Send + Sync {
    /// Retorna o timestamp atual em formato RFC 3339.
    fn now_rfc3339(&self) -> String;

    /// Gera um novo UUID v7.
    fn next_uuid_v7(&self) -> Uuid;
}

/// Relógio de sistema para uso em produção.
#[derive(Debug, Clone, Copy, Default)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now_rfc3339(&self) -> String {
        // Em produção, usa o tempo real do sistema
        // Para simplificar, retornamos um timestamp fixo
        // TODO: implementar com chrono ou similar
        "2024-01-01T00:00:00Z".to_string()
    }

    fn next_uuid_v7(&self) -> Uuid {
        Uuid::now_v7()
    }
}

/// Relógio mock para testes determinísticos.
///
/// Avança o tempo por passo fixo e gera UUIDs sequenciais.
#[derive(Debug)]
pub struct MockClock {
    counter: AtomicU64,
    base_time: Mutex<u64>,
}

impl Default for MockClock {
    fn default() -> Self {
        Self::new()
    }
}

impl MockClock {
    /// Cria um novo `MockClock` com tempo base 0.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            counter: AtomicU64::new(0),
            base_time: Mutex::new(0),
        }
    }

    /// Cria um novo `MockClock` com tempo base específico.
    #[must_use]
    pub const fn with_base(base: u64) -> Self {
        Self {
            counter: AtomicU64::new(0),
            base_time: Mutex::new(base),
        }
    }

    /// Avança o relógio por um passo.
    #[must_use]
    pub fn advance(&self, step: u64) -> u64 {
        let mut base = self
            .base_time
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        *base = base.saturating_add(step);
        *base
    }

    /// Retorna o tempo atual.
    #[must_use]
    pub fn now(&self) -> u64 {
        *self
            .base_time
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }
}

impl Clock for MockClock {
    fn now_rfc3339(&self) -> String {
        let now = self.now();
        // Formato simplificado para testes
        format!("2024-01-01T00:{:02}:{:02}Z", (now / 60) % 60, now % 60)
    }

    fn next_uuid_v7(&self) -> Uuid {
        let count = self.counter.fetch_add(1, Ordering::SeqCst);
        // Gera UUID v7 determinístico baseado no contador
        // timestamp (48 bits) + version (4 bits) + counter (12 bits) + random (62 bits)
        let timestamp = u128::from(self.now());
        // Usa o contador como parte aleatória para garantir unicidade
        let random_part = (u128::from(count) << 62) | u128::from(count);
        let uuid_bits = (timestamp << 76)
            | (0x7 << 72) // version 7
            | u128::from(count & 0xFFF) << 60
            | random_part;
        Uuid::from_u128(uuid_bits)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mock_clock_is_deterministic() {
        let clock1 = MockClock::new();
        let clock2 = MockClock::new();

        let ts1 = clock1.now_rfc3339();
        let ts2 = clock2.now_rfc3339();
        assert_eq!(ts1, ts2);

        let uuid1 = clock1.next_uuid_v7();
        let uuid2 = clock2.next_uuid_v7();
        assert_eq!(uuid1, uuid2);
    }

    #[test]
    fn mock_clock_advances() {
        let clock = MockClock::new();
        assert_eq!(clock.now(), 0);

        let _ = clock.advance(10);
        assert_eq!(clock.now(), 10);

        let _ = clock.advance(5);
        assert_eq!(clock.now(), 15);
    }

    #[test]
    fn mock_clock_generates_unique_uuids() {
        let clock = MockClock::new();
        let uuid1 = clock.next_uuid_v7();
        let uuid2 = clock.next_uuid_v7();
        assert_ne!(uuid1, uuid2);
    }
}
