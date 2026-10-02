//! Impressão determinística de estado/resultado.
//!
//! Mesma entrada → mesma impressão (hex de 64 bits), comparável entre execuções.

/// Acumulador FNV-1a de 64 bits.
#[derive(Debug, Clone, Copy)]
pub struct Fingerprint(u64);

/// Primo FNV de 64 bits.
const PRIME: u64 = 0x0000_0100_0000_01b3;

/// Offset basis FNV-1a de 64 bits.
const OFFSET: u64 = 0xcbf2_9ce4_8422_2325;

impl Fingerprint {
    /// Novo acumulador (estado FNV-1a inicial).
    #[must_use]
    pub const fn new() -> Self {
        Self(OFFSET)
    }

    /// Acumula bytes crus.
    pub fn write(&mut self, bytes: &[u8]) {
        for byte in bytes {
            self.0 ^= u64::from(*byte);
            self.0 = self.0.wrapping_mul(PRIME);
        }
    }

    /// Acumula um fragmento **prefixado com o comprimento** (não ambíguo entre fronteiras).
    pub fn write_fragment<T: AsRef<[u8]>>(&mut self, part: T) {
        let bytes = part.as_ref();
        self.write(&u64::try_from(bytes.len()).unwrap_or(u64::MAX).to_le_bytes());
        self.write(bytes);
    }

    /// Valor do hash.
    #[must_use]
    pub const fn value(self) -> u64 {
        self.0
    }

    /// Impressão em 16 hex.
    #[must_use]
    pub fn hex(self) -> String {
        format!("{:016x}", self.0)
    }
}

impl Default for Fingerprint {
    fn default() -> Self {
        Self::new()
    }
}

/// Hash de uma sequência de fragmentos.
#[must_use]
pub fn of(parts: &[&[u8]]) -> u64 {
    let mut fp = Fingerprint::new();
    for part in parts {
        fp.write_fragment(*part);
    }
    fp.value()
}

/// Macro de conveniência para fingerprint de múltiplos fragmentos.
///
/// ```
/// let a = calc_auy_core::fingerprint!("a", "bc");
/// let b = calc_auy_core::fingerprint!("ab", "c");
/// assert_ne!(a, b);
/// assert_eq!(a, calc_auy_core::fingerprint!("a", "bc"));
/// ```
#[macro_export]
macro_rules! fingerprint {
    ($($part:expr),* $(,)?) => {{
        let mut fp = $crate::diag::fingerprint::Fingerprint::new();
        $(fp.write_fragment($part.as_ref() as &[u8]);)*
        fp.hex()
    }};
}

#[cfg(test)]
mod tests {
    use super::{Fingerprint, of};

    #[test]
    fn same_input_has_the_same_print() {
        let a = of(&[b"hello", b"world"]);
        let b = of(&[b"hello", b"world"]);
        assert_eq!(a, b);
    }

    #[test]
    fn different_input_has_different_print() {
        let a = of(&[b"hello", b"world"]);
        let b = of(&[b"world", b"hello"]);
        assert_ne!(a, b);
    }

    #[test]
    fn boundary_is_not_ambiguous() {
        // "a" + "bc" != "ab" + "c"
        let a = of(&[b"a", b"bc"]);
        let b = of(&[b"ab", b"c"]);
        assert_ne!(a, b);
    }

    #[test]
    fn fingerprint_hex_is_deterministic() {
        let fp1 = Fingerprint::new();
        let fp2 = Fingerprint::new();
        assert_eq!(fp1.hex(), fp2.hex());
    }
}
