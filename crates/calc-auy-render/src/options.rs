//! Tipos de opção compartilhados pelos renderizadores.
//!
//! O projeto proíbe booleanos em APIs públicas (`max-fn-params-bools = 0`,
//! `max-struct-bools = 1`); estados mutuamente exclusivos são modelados como
//! enums de duas variantes.

/// Estilo tipográfico da fórmula.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum MathStyle {
    /// Bloco (*display*): fórmula isolada, centralizada e em corpo maior.
    #[default]
    Display,
    /// Embutida (*inline*) em texto corrente.
    Text,
}

impl MathStyle {
    /// Retorna `true` para o estilo *display*.
    #[must_use]
    pub(crate) const fn is_display(self) -> bool {
        matches!(self, Self::Display)
    }
}

/// Política de tratamento de erros de parsing do `KaTeX`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum ErrorPolicy {
    /// Renderiza o erro como marcação colorida no próprio HTML.
    #[default]
    Render,
    /// Interrompe a renderização retornando [`RenderError`](crate::RenderError).
    Throw,
}

/// Modo de injeção do CSS do `KaTeX` no fragmento HTML.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum CssMode {
    /// Injeta o CSS no próprio fragmento (saída auto-contida).
    #[default]
    Inline,
    /// Não injeta (presume que o CSS já está presente na página).
    External,
}

/// Cor RGB de 8 bits por canal.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Rgb {
    /// Canal vermelho.
    pub red: u8,
    /// Canal verde.
    pub green: u8,
    /// Canal azul.
    pub blue: u8,
}

impl Rgb {
    /// Preto.
    pub const BLACK: Self = Self::new(0, 0, 0);
    /// Branco.
    pub const WHITE: Self = Self::new(255, 255, 255);

    /// Cria uma cor RGB.
    #[must_use]
    pub const fn new(red: u8, green: u8, blue: u8) -> Self {
        Self { red, green, blue }
    }

    /// Converte para a cor do `latex-rust`.
    #[must_use]
    pub(crate) const fn to_latex(self) -> latex_rust::Color {
        latex_rust::Color::rgb(self.red, self.green, self.blue)
    }
}

impl Default for Rgb {
    fn default() -> Self {
        Self::BLACK
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn style_maps_to_display() {
        assert!(MathStyle::Display.is_display());
        assert!(!MathStyle::Text.is_display());
    }

    #[test]
    fn rgb_converts_to_latex() {
        assert_eq!(
            Rgb::new(10, 20, 30).to_latex(),
            latex_rust::Color::rgb(10, 20, 30)
        );
    }
}
