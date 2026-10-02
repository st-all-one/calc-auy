//! Cache de avaliação por conteúdo (memoização).

use std::collections::BTreeMap;

use crate::integrity::Digest;
use crate::numeric::Rational;

/// Cache limitado de resultados por hash de conteúdo.
///
/// Usa `BTreeMap` (determinístico). Quando atinge a capacidade, é limpo por
/// inteiro — política simples e previsível para escopo de sessão.
#[derive(Debug, Clone)]
pub struct EvalCache {
    /// Entradas por hash de subárvore.
    entries: BTreeMap<Digest, Rational>,
    /// Capacidade máxima de entradas.
    capacity: usize,
    /// Número de acertos.
    hits: u64,
    /// Número de consultas sem acerto.
    misses: u64,
}

impl EvalCache {
    /// Cria um cache com a capacidade dada (mínimo 1).
    #[must_use]
    pub fn new(capacity: usize) -> Self {
        Self {
            entries: BTreeMap::new(),
            capacity: capacity.max(1),
            hits: 0,
            misses: 0,
        }
    }

    /// Consulta um resultado pelo hash de conteúdo.
    pub fn get(&mut self, key: &Digest) -> Option<Rational> {
        if let Some(value) = self.entries.get(key) {
            self.hits = self.hits.saturating_add(1);
            return Some(value.clone());
        }
        self.misses = self.misses.saturating_add(1);
        None
    }

    /// Insere um resultado associado ao hash de conteúdo.
    pub fn insert(&mut self, key: Digest, value: Rational) {
        if self.entries.len() >= self.capacity {
            self.entries.clear();
        }
        self.entries.insert(key, value);
    }

    /// Retorna o número de entradas.
    #[must_use]
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Retorna `true` se o cache está vazio.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Retorna o número de acertos.
    #[must_use]
    pub const fn hits(&self) -> u64 {
        self.hits
    }

    /// Retorna o número de consultas sem acerto.
    #[must_use]
    pub const fn misses(&self) -> u64 {
        self.misses
    }

    /// Retorna a taxa de acerto em pontos percentuais (0–100), sem `f64`.
    #[must_use]
    pub fn hit_rate_percent(&self) -> u32 {
        let total = self.hits.saturating_add(self.misses);
        if total == 0 {
            return 0;
        }
        let percent = self
            .hits
            .saturating_mul(100)
            .checked_div(total)
            .unwrap_or(0);
        u32::try_from(percent).unwrap_or(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tracks_hits_and_misses() {
        let mut cache = EvalCache::new(4);
        let key = Digest::from_bytes([1; 32]);
        assert!(cache.get(&key).is_none());
        cache.insert(key, Rational::from_i64(42));
        assert_eq!(cache.get(&key), Some(Rational::from_i64(42)));
        assert_eq!(cache.hits(), 1);
        assert_eq!(cache.misses(), 1);
        assert_eq!(cache.hit_rate_percent(), 50);
    }

    #[test]
    fn evicts_when_full() {
        let mut cache = EvalCache::new(2);
        cache.insert(Digest::from_bytes([1; 32]), Rational::ONE);
        cache.insert(Digest::from_bytes([2; 32]), Rational::ONE);
        cache.insert(Digest::from_bytes([3; 32]), Rational::ONE);
        assert_eq!(cache.len(), 1);
    }
}
