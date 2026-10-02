//! Lexer zero-copy: tokens carregam fatias `&str` da entrada.

use crate::error::{ParseError, Span};

/// Tipo de token.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TokenKind {
    /// Número (inteiro, decimal ou científico).
    Number,
    /// `+`.
    Plus,
    /// `-`.
    Minus,
    /// `*`.
    Star,
    /// `/`.
    Slash,
    /// `%` (módulo ou percentual).
    Percent,
    /// `^`.
    Caret,
    /// `(`.
    LParen,
    /// `)`.
    RParen,
}

impl TokenKind {
    /// Retorna o texto canônico do token.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Number => "número",
            Self::Plus => "+",
            Self::Minus => "-",
            Self::Star => "*",
            Self::Slash => "/",
            Self::Percent => "%",
            Self::Caret => "^",
            Self::LParen => "(",
            Self::RParen => ")",
        }
    }
}

/// Token com a fatia de origem e a posição.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Token<'a> {
    /// Tipo do token.
    pub kind: TokenKind,
    /// Fatia da entrada (zero-copy).
    pub text: &'a str,
    /// Posição na entrada.
    pub span: Span,
}

/// Lexer sobre `&str`.
#[derive(Debug, Clone)]
pub struct Lexer<'a> {
    /// Entrada completa.
    input: &'a str,
    /// Posição atual em bytes.
    pos: usize,
}

impl<'a> Lexer<'a> {
    /// Cria um lexer sobre a entrada.
    #[must_use]
    pub const fn new(input: &'a str) -> Self {
        Self { input, pos: 0 }
    }

    /// Retorna o byte na posição, se houver.
    fn byte_at(&self, position: usize) -> Option<u8> {
        self.input.as_bytes().get(position).copied()
    }

    /// Avança uma posição.
    const fn advance(&mut self) {
        self.pos = self.pos.saturating_add(1);
    }

    /// Consome uma sequência de dígitos e `_`.
    fn consume_digits(&mut self) {
        while self
            .byte_at(self.pos)
            .is_some_and(|byte| byte.is_ascii_digit() || byte == b'_')
        {
            self.advance();
        }
    }

    /// Pula espaços em branco.
    fn skip_whitespace(&mut self) {
        while self
            .byte_at(self.pos)
            .is_some_and(|byte| byte.is_ascii_whitespace())
        {
            self.advance();
        }
    }

    /// Lê um número.
    fn lex_number(&mut self) -> Token<'a> {
        let start = self.pos;
        self.consume_digits();
        if self.byte_at(self.pos) == Some(b'.') {
            self.advance();
            self.consume_digits();
        }
        self.lex_exponent();
        let text = self.input.get(start..self.pos).unwrap_or("");
        Token {
            kind: TokenKind::Number,
            text,
            span: Span::new(start, self.pos),
        }
    }

    /// Lê a parte do expoente científico, se presente.
    fn lex_exponent(&mut self) {
        if !matches!(self.byte_at(self.pos), Some(b'e' | b'E')) {
            return;
        }
        let exponent_start = self.pos;
        self.advance();
        if matches!(self.byte_at(self.pos), Some(b'+' | b'-')) {
            self.advance();
        }
        let digits_start = self.pos;
        while self
            .byte_at(self.pos)
            .is_some_and(|byte| byte.is_ascii_digit())
        {
            self.advance();
        }
        if self.pos == digits_start {
            self.pos = exponent_start;
        }
    }

    /// Lê um operador de um byte.
    fn lex_operator(&mut self, byte: u8) -> Option<Token<'a>> {
        let kind = match byte {
            b'+' => TokenKind::Plus,
            b'-' => TokenKind::Minus,
            b'*' => TokenKind::Star,
            b'/' => TokenKind::Slash,
            b'%' => TokenKind::Percent,
            b'^' => TokenKind::Caret,
            b'(' => TokenKind::LParen,
            b')' => TokenKind::RParen,
            _ => return None,
        };
        let start = self.pos;
        self.advance();
        let text = self.input.get(start..self.pos).unwrap_or("");
        Some(Token {
            kind,
            text,
            span: Span::new(start, self.pos),
        })
    }
}

impl<'a> Iterator for Lexer<'a> {
    type Item = Result<Token<'a>, ParseError>;

    fn next(&mut self) -> Option<Self::Item> {
        self.skip_whitespace();
        let byte = self.byte_at(self.pos)?;
        if byte.is_ascii_digit() || (byte == b'.' && self.next_is_digit()) {
            return Some(Ok(self.lex_number()));
        }
        if let Some(token) = self.lex_operator(byte) {
            return Some(Ok(token));
        }
        let start = self.pos;
        let character = self.input.get(start..).and_then(|rest| rest.chars().next());
        let length = character.map_or(1, char::len_utf8);
        self.pos = self.pos.saturating_add(length);
        Some(Err(ParseError::syntax(
            format!("caractere inesperado: {}", character.unwrap_or('\u{fffd}')),
            Span::new(start, self.pos),
        )))
    }
}

impl Lexer<'_> {
    /// Retorna `true` se o próximo byte for um dígito.
    fn next_is_digit(&self) -> bool {
        self.byte_at(self.pos.saturating_add(1))
            .is_some_and(|byte| byte.is_ascii_digit())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn kinds(input: &str) -> Vec<TokenKind> {
        Lexer::new(input)
            .map(|token| token.expect("token válido").kind)
            .collect()
    }

    #[test]
    fn tokenizes_operators() {
        assert_eq!(
            kinds("1+2*3-4/5%6^7"),
            vec![
                TokenKind::Number,
                TokenKind::Plus,
                TokenKind::Number,
                TokenKind::Star,
                TokenKind::Number,
                TokenKind::Minus,
                TokenKind::Number,
                TokenKind::Slash,
                TokenKind::Number,
                TokenKind::Percent,
                TokenKind::Number,
                TokenKind::Caret,
                TokenKind::Number,
            ]
        );
    }

    #[test]
    fn tokenizes_numbers_zero_copy() {
        let tokens: Vec<_> = Lexer::new("3.14 1e10 .5 1_000")
            .map(|token| token.expect("token"))
            .collect();
        assert_eq!(tokens.len(), 4);
        assert_eq!(tokens[0].text, "3.14");
        assert_eq!(tokens[1].text, "1e10");
        assert_eq!(tokens[2].text, ".5");
        assert_eq!(tokens[3].text, "1_000");
        assert!(tokens.iter().all(|token| token.kind == TokenKind::Number));
    }

    #[test]
    fn tracks_positions() {
        let tokens: Vec<_> = Lexer::new("12 + 3")
            .map(|token| token.expect("token"))
            .collect();
        assert_eq!(tokens[0].span, Span::new(0, 2));
        assert_eq!(tokens[1].span, Span::new(3, 4));
        assert_eq!(tokens[2].span, Span::new(5, 6));
    }

    #[test]
    fn rejects_unknown_character() {
        let error = Lexer::new("1 @ 2").next().and_then(|token| token.err());
        // O primeiro token é `1`; o erro vem depois.
        assert!(error.is_none());
        let errors: Vec<_> = Lexer::new("1 @ 2")
            .filter_map(|token| token.err())
            .collect();
        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].span(), Span::new(2, 3));
    }
}
