//! Catálogo de identificadores de evento.
//!
//! **Fonte única de verdade** dos nomes usados em `span!`/`event!`. Regras:
//!
//! - Formato `<subsistema>.<ação>` (≥ 2 segmentos), minúsculas `[a-z0-9_]`.
//! - Estáveis: mudar um id é uma decisão registada.

/// Versão do catálogo. Incrementa ao remover/renomear ids.
pub const CATALOG_VERSION: u16 = 1;

macro_rules! catalog {
    ($(($name:ident, $id:literal, $doc:literal)),* $(,)?) => {
        $(
            #[doc = $doc]
            pub const $name: &str = $id;
        )*
        /// Todos os identificadores do catálogo (para validação e ferramentas).
        pub const ALL: &[&str] = &[$($id),*];
    };
}

catalog! {
    // -- Execução / arranque -------------------------------------------------
    (CALC_AUY_RUN, "calc_auy.run", "Execução de topo."),
    (CALC_AUY_COMMIT, "calc_auy.commit", "Commit de um cálculo."),
    (CALC_AUY_HIBERNATE, "calc_auy.hibernate", "Hibernação de um cálculo."),
    (CALC_AUY_HYDRATE, "calc_auy.hydrate", "Hidratação de um cálculo."),

    // -- Core ------------------------------------------------------------------
    (RATIONAL_CREATE, "rational.create", "Criação de um Rational."),
    (RATIONAL_OP, "rational.op", "Operação aritmética."),
    (AST_EVAL, "ast.eval", "Avaliação de AST."),
    (AST_VALIDATE, "ast.validate", "Validação de AST."),
    (ROUNDING_APPLY, "rounding.apply", "Aplicação de arredondamento."),
    (SIGNATURE_GEN, "signature.gen", "Geração de assinatura."),
    (SIGNATURE_VERIFY, "signature.verify", "Verificação de assinatura."),

    // -- Output ----------------------------------------------------------------
    (OUTPUT_FORMAT, "output.format", "Formatação de saída."),
    (OUTPUT_CACHE_HIT, "output.cache_hit", "Cache de output hit."),
    (OUTPUT_CACHE_MISS, "output.cache_miss", "Cache de output miss."),

    // -- Parser ----------------------------------------------------------------
    (LEXER_TOKENIZE, "lexer.tokenize", "Tokenização de expressão."),
    (PARSER_PARSE, "parser.parse", "Parsing de expressão."),

    // -- Function span genérico -----------------------------------------------
    (
        CALC_AUY_FN,
        "calc_auy.fn",
        "Span genérico de função: o rótulo real viaja em `Record.function`."
    ),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_has_stable_ids() {
        assert_eq!(CALC_AUY_RUN, "calc_auy.run");
        assert_eq!(CALC_AUY_COMMIT, "calc_auy.commit");
        assert_eq!(RATIONAL_CREATE, "rational.create");
    }

    #[test]
    fn all_ids_are_lowercase() {
        for id in ALL {
            assert!(
                id.chars()
                    .all(|c| c.is_ascii_lowercase() || c == '.' || c == '_')
            );
        }
    }
}
