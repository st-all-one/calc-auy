//! Tiling de reduções `SoA` para manter o trabalho quente na L1/L2.

use crate::error::CalcAuyError;
use crate::limits::Limits;
use crate::numeric::{Rational, reduce};

use super::soa::SmallBatch;

/// Tamanho de tile padrão.
pub const DEFAULT_TILE: usize = 1024;

/// Configuração de tiling.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TileConfig {
    /// Número de elementos por tile.
    tile: usize,
}

impl Default for TileConfig {
    fn default() -> Self {
        Self { tile: DEFAULT_TILE }
    }
}

impl TileConfig {
    /// Cria uma configuração com o tile dado (mínimo 1).
    #[must_use]
    pub const fn new(tile: usize) -> Self {
        Self {
            tile: if tile == 0 { 1 } else { tile },
        }
    }

    /// Retorna o tamanho do tile.
    #[must_use]
    pub const fn tile(self) -> usize {
        self.tile
    }
}

/// Soma exata de um tile (redução em árvore dentro do tile).
///
/// # Errors
///
/// Retorna erro se algum par for inválido.
pub fn sum_tile(nums: &[u64], dens: &[u64], limits: &Limits) -> Result<Rational, CalcAuyError> {
    let mut values = Vec::with_capacity(nums.len().min(dens.len()));
    for (numerator, denominator) in nums.iter().zip(dens) {
        values.push(Rational::from_u64_pair(*numerator, *denominator, limits)?);
    }
    Ok(reduce::sum_tree(&values))
}

/// Produto exato de um tile (redução em árvore dentro do tile).
///
/// # Errors
///
/// Retorna erro se algum par for inválido.
pub fn prod_tile(nums: &[u64], dens: &[u64], limits: &Limits) -> Result<Rational, CalcAuyError> {
    let mut values = Vec::with_capacity(nums.len().min(dens.len()));
    for (numerator, denominator) in nums.iter().zip(dens) {
        values.push(Rational::from_u64_pair(*numerator, *denominator, limits)?);
    }
    Ok(reduce::prod_tree(&values))
}

impl SmallBatch {
    /// Soma exata com tiling: parciais por tile, depois redução em árvore.
    ///
    /// # Errors
    ///
    /// Retorna erro se um valor for inválido ou um limite for excedido.
    pub fn sum_tiled(&self, tile: usize, limits: &Limits) -> Result<Rational, CalcAuyError> {
        let tile = tile.max(1);
        let mut partials = Vec::new();
        for (nums, dens) in self
            .numerators()
            .chunks(tile)
            .zip(self.denominators().chunks(tile))
        {
            partials.push(sum_tile(nums, dens, limits)?);
        }
        let result = reduce::sum_tree(&partials);
        limits.check_bits(result.bits())?;
        Ok(result)
    }

    /// Produto exato com tiling: parciais por tile, depois redução em árvore.
    ///
    /// # Errors
    ///
    /// Retorna erro se um valor for inválido ou um limite for excedido.
    pub fn product_tiled(&self, tile: usize, limits: &Limits) -> Result<Rational, CalcAuyError> {
        let tile = tile.max(1);
        let mut partials = Vec::new();
        for (nums, dens) in self
            .numerators()
            .chunks(tile)
            .zip(self.denominators().chunks(tile))
        {
            partials.push(prod_tile(nums, dens, limits)?);
        }
        let result = reduce::prod_tree(&partials);
        limits.check_bits(result.bits())?;
        Ok(result)
    }
}
