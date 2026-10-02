# 04 — Core: AST e Engine de Avaliação

> ⚠️ **Superado pelo [doc 14](./14-arquitetura-oficial-rust.md)** (ADR-002, ADR-005, ADR-006,
> ADR-007): wire `snake_case` versionado, `eval` exige `VerifiedAst`, limites como invariantes
> e `MetaValue` (sem `serde_json::Value`).

## Objetivo

Representar a estrutura do cálculo como uma **árvore de sintaxe abstrata (AST) imutável** e fornecer um **engine de avaliação** que colapsa a árvore em um resultado racional.

---

## Definição da AST

```rust
// crates/calc-auy-core/src/ast.rs

use num_bigint::BigInt;
use serde::{Serialize, Deserialize};
use std::collections::BTreeMap;

/// Tipos de operações matemáticas suportadas.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum OperationType {
    Add,
    Sub,
    Mul,
    Div,
    Pow,
    Mod,
    DivInt,
    CrossContextAdd,
}

/// Valor racional serializado.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RationalValue {
    pub n: String,
    pub d: String,
}

/// Metadados de auditoria.
pub type MetadataValue = serde_json::Value;
pub type Metadata = BTreeMap<String, MetadataValue>;

/// Nó da AST.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Node {
    /// Valor literal (ex: "10", "3.14", "1/2").
    Literal {
        value: RationalValue,
        original_input: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        metadata: Option<Metadata>,
    },
    /// Operação matemática com operandos.
    Operation {
        op_type: OperationType,
        operands: Vec<Node>,
        #[serde(skip_serializing_if = "Option::is_none")]
        metadata: Option<Metadata>,
    },
    /// Agrupamento lógico (parênteses).
    Group {
        child: Box<Node>,
        #[serde(skip_serializing_if = "Option::is_none")]
        metadata: Option<Metadata>,
    },
    /// Nó de controle para rastreabilidade de jurisdição.
    Control {
        child: Box<Node>,
        previous_context_label: String,
        previous_signature: String,
        previous_round_strategy: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        metadata: Option<Metadata>,
    },
}

/// AST completa com informações de serialização.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Ast {
    pub root: Node,
    pub context_label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub final_result: Option<RationalValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub round_strategy: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signature: Option<String>,
}
```

---

## Construção da AST

```rust
impl Node {
    /// Cria um nó literal a partir de um racional.
    pub fn literal(rational: &Rational, original_input: String) -> Self {
        Node::Literal {
            value: RationalValue {
                n: rational.numerator().to_string(),
                d: rational.denominator().to_string(),
            },
            original_input,
            metadata: None,
        }
    }

    /// Cria um nó de operação.
    pub fn operation(op_type: OperationType, operands: Vec<Node>) -> Self {
        Node::Operation {
            op_type,
            operands,
            metadata: None,
        }
    }

    /// Cria um nó de grupo.
    pub fn group(child: Node) -> Self {
        Node::Group {
            child: Box::new(child),
            metadata: None,
        }
    }

    /// Adiciona metadados ao nó.
    pub fn with_metadata(mut self, key: String, value: MetadataValue) -> Self {
        let metadata = match &mut self {
            Node::Literal { metadata, .. } => metadata,
            Node::Operation { metadata, .. } => metadata,
            Node::Group { metadata, .. } => metadata,
            Node::Control { metadata, .. } => metadata,
        };

        if metadata.is_none() {
            *metadata = Some(BTreeMap::new());
        }
        metadata.as_mut().unwrap().insert(key, value);
        self
    }

    /// Retorna o tipo do nó.
    pub fn kind(&self) -> &'static str {
        match self {
            Node::Literal { .. } => "literal",
            Node::Operation { .. } => "operation",
            Node::Group { .. } => "group",
            Node::Control { .. } => "control",
        }
    }
}
```

---

## Engine de Avaliação

```rust
// crates/calc-auy-core/src/engine.rs

use crate::ast::{Node, OperationType};
use crate::error::CalcAuyError;
use crate::rational::Rational;
use num_bigint::BigInt;

/// Limite de profundidade da AST para prevenir stack overflow.
const MAX_DEPTH: usize = 500;

/// Limite de nós na AST para prevenir DoS.
const MAX_NODES: usize = 1000;

/// Avalia a AST e retorna o resultado racional.
///
/// Implementa percurso pós-ordem iterativo (stack-based) para evitar
/// estouro da pilha de chamadas em árvores profundas.
pub fn eval(root: &Node) -> Result<Rational, CalcAuyError> {
    let mut stack = vec![(root, 0)];
    let mut result_stack: Vec<Rational> = Vec::new();
    let mut node_count = 0;

    while let Some((node, depth)) = stack.pop() {
        // Verifica limites de segurança
        if depth > MAX_DEPTH {
            return Err(CalcAuyError::MaxDepthExceeded { depth, max: MAX_DEPTH });
        }

        node_count += 1;
        if node_count > MAX_NODES {
            return Err(CalcAuyError::MaxNodesExceeded { count: node_count, max: MAX_NODES });
        }

        match node {
            Node::Literal { value, .. } => {
                let n = value.n.parse::<BigInt>()
                    .map_err(|_| CalcAuyError::CorruptedNode {
                        reason: "invalid numerator".to_string(),
                    })?;
                let d = value.d.parse::<BigInt>()
                    .map_err(|_| CalcAuyError::CorruptedNode {
                        reason: "invalid denominator".to_string(),
                    })?;
                let rational = Rational::new(n, d)?;
                result_stack.push(rational);
            }

            Node::Group { child, .. } => {
                stack.push((child, depth + 1));
            }

            Node::Control { child, .. } => {
                stack.push((child, depth + 1));
            }

            Node::Operation { op_type, operands, .. } => {
                if operands.is_empty() {
                    return Err(CalcAuyError::CorruptedNode {
                        reason: "operation without operands".to_string(),
                    });
                }

                // Agenda aplicação da operação
                stack.push((node, depth)); // Re-adiciona para aplicar após operandos

                // Agenda avaliação dos operandos em ordem inversa
                for operand in operands.iter().rev() {
                    stack.push((operand, depth + 1));
                }
            }
        }

        // Verifica se é hora de aplicar uma operação
        // (quando todos os operandos já foram avaliados)
        // Esta lógica precisa ser refinada para o padrão iterativo correto
    }

    // O resultado final é o único item restante
    result_stack.pop()
        .ok_or_else(|| CalcAuyError::CorruptedNode {
            reason: "empty result stack".to_string(),
        })
}
```

---

## Engine de Avaliação (Implementação Completa)

A implementação anterior precisa de um padrão mais sofisticado para o percurso pós-ordem iterativo. Aqui está a versão corrigida:

```rust
// crates/calc-auy-core/src/engine.rs

use crate::ast::{Node, OperationType};
use crate::error::CalcAuyError;
use crate::rational::Rational;
use num_bigint::BigInt;

const MAX_DEPTH: usize = 500;
const MAX_NODES: usize = 1000;

/// Tarefas para o motor de avaliação iterativo.
enum EvalTask<'a> {
    Eval(&'a Node, usize),
    Apply(OperationType, usize, &'a Node),
}

/// Avalia a AST usando percurso pós-ordem iterativo.
pub fn eval(root: &Node) -> Result<Rational, CalcAuyError> {
    let mut work_stack = vec![EvalTask::Eval(root, 0)];
    let mut result_stack: Vec<Rational> = Vec::new();
    let mut node_count = 0;

    while let Some(task) = work_stack.pop() {
        match task {
            EvalTask::Eval(node, depth) => {
                if depth > MAX_DEPTH {
                    return Err(CalcAuyError::MaxDepthExceeded { depth, max: MAX_DEPTH });
                }

                node_count += 1;
                if node_count > MAX_NODES {
                    return Err(CalcAuyError::MaxNodesExceeded { count: node_count, max: MAX_NODES });
                }

                match node {
                    Node::Literal { value, .. } => {
                        let n = parse_bigint(&value.n)?;
                        let d = parse_bigint(&value.d)?;
                        let rational = Rational::new(n, d)?;
                        result_stack.push(rational);
                    }

                    Node::Group { child, .. } | Node::Control { child, .. } => {
                        work_stack.push(EvalTask::Eval(child, depth + 1));
                    }

                    Node::Operation { op_type, operands, .. } => {
                        if operands.is_empty() {
                            return Err(CalcAuyError::CorruptedNode {
                                reason: "operation without operands".to_string(),
                            });
                        }

                        // Agenda aplicação da operação
                        work_stack.push(EvalTask::Apply(*op_type, operands.len(), node));

                        // Agenda avaliação dos operandos em ordem inversa
                        for operand in operands.iter().rev() {
                            work_stack.push(EvalTask::Eval(operand, depth + 1));
                        }
                    }
                }
            }

            EvalTask::Apply(op_type, count, parent) => {
                // Coleta operandos da pilha de resultados
                let mut operands = Vec::with_capacity(count);
                for _ in 0..count {
                    operands.push(result_stack.pop()
                        .ok_or_else(|| CalcAuyError::CorruptedNode {
                            reason: "missing operand".to_string(),
                        })?);
                }
                operands.reverse();

                let result = apply_operation(op_type, &operands, parent)?;
                result_stack.push(result);
            }
        }
    }

    result_stack.pop()
        .ok_or_else(|| CalcAuyError::CorruptedNode {
            reason: "empty result stack".to_string(),
        })
}

/// Aplica uma operação matemática sobre os operandos.
fn apply_operation(
    op_type: OperationType,
    operands: &[Rational],
    parent: &Node,
) -> Result<Rational, CalcAuyError> {
    if operands.is_empty() {
        return Err(CalcAuyError::CorruptedNode {
            reason: "no operands".to_string(),
        });
    }

    let mut acc = operands[0].clone();

    for operand in &operands[1..] {
        acc = match op_type {
            OperationType::Add | OperationType::CrossContextAdd => acc + operand.clone(),
            OperationType::Sub => acc - operand.clone(),
            OperationType::Mul => acc * operand.clone(),
            OperationType::Div => {
                if operand.numerator().is_zero() {
                    return Err(CalcAuyError::DivisionByZero);
                }
                acc / operand.clone()
            }
            OperationType::Pow => acc.pow(operand)?,
            OperationType::Mod => acc.rem(operand),
            OperationType::DivInt => acc.div_int(operand),
        };
    }

    Ok(acc)
}

fn parse_bigint(s: &str) -> Result<BigInt, CalcAuyError> {
    s.parse::<BigInt>()
        .map_err(|_| CalcAuyError::CorruptedNode {
            reason: format!("invalid bigint: {}", s),
        })
}
```

---

## Validação da AST

```rust
impl Node {
    /// Valida a estrutura da AST recursivamente.
    ///
    /// Verifica:
    /// - Profundidade máxima
    /// - Número máximo de nós
    /// - Detecção de ciclos (via contagem de nós)
    /// - Estrutura válida de cada nó
    pub fn validate(&self) -> Result<(), CalcAuyError> {
        let mut state = ValidationState::default();
        self.validate_inner(0, &mut state)
    }

    fn validate_inner(&self, depth: usize, state: &mut ValidationState) -> Result<(), CalcAuyError> {
        if depth > MAX_DEPTH {
            return Err(CalcAuyError::MaxDepthExceeded { depth, max: MAX_DEPTH });
        }

        state.node_count += 1;
        if state.node_count > MAX_NODES {
            return Err(CalcAuyError::MaxNodesExceeded {
                count: state.node_count,
                max: MAX_NODES,
            });
        }

        match self {
            Node::Literal { value, .. } => {
                // Verifica se n e d são strings válidas
                if value.n.parse::<BigInt>().is_err() {
                    return Err(CalcAuyError::CorruptedNode {
                        reason: "invalid numerator".to_string(),
                    });
                }
                if value.d.parse::<BigInt>().is_err() {
                    return Err(CalcAuyError::CorruptedNode {
                        reason: "invalid denominator".to_string(),
                    });
                }
                Ok(())
            }

            Node::Group { child, .. } | Node::Control { child, .. } => {
                child.validate_inner(depth + 1, state)
            }

            Node::Operation { op_type, operands, .. } => {
                if operands.is_empty() {
                    return Err(CalcAuyError::CorruptedNode {
                        reason: "operation without operands".to_string(),
                    });
                }
                for operand in operands {
                    operand.validate_inner(depth + 1, state)?;
                }
                Ok(())
            }
        }
    }
}

#[derive(Default)]
struct ValidationState {
    node_count: usize,
}
```

---

## Precedência e Associatividade

```rust
/// Tabela de precedência para operações matemáticas.
/// Valores menores indicam prioridade superior.
pub fn precedence(op: OperationType) -> u8 {
    match op {
        OperationType::Pow => 2,
        OperationType::Mul | OperationType::Div | OperationType::DivInt | OperationType::Mod => 3,
        OperationType::Add | OperationType::Sub | OperationType::CrossContextAdd => 4,
    }
}

/// Verifica se a operação é associativa à direita.
pub fn is_right_associative(op: OperationType) -> bool {
    matches!(op, OperationType::Pow)
}
```

---

## Testes

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::rational::Rational;

    #[test]
    fn test_eval_literal() {
        let node = Node::literal(
            &Rational::from_str("10.5").unwrap(),
            "10.5".to_string(),
        );
        let result = eval(&node).unwrap();
        assert_eq!(result.numerator(), &BigInt::from(21));
        assert_eq!(result.denominator(), &BigInt::from(2));
    }

    #[test]
    fn test_eval_addition() {
        let left = Node::literal(&Rational::from_int(BigInt::from(10)), "10".to_string());
        let right = Node::literal(&Rational::from_int(BigInt::from(5)), "5".to_string());
        let op = Node::operation(OperationType::Add, vec![left, right]);

        let result = eval(&op).unwrap();
        assert_eq!(result.numerator(), &BigInt::from(15));
        assert_eq!(result.denominator(), &BigInt::one());
    }

    #[test]
    fn test_eval_multiplication() {
        let left = Node::literal(&Rational::from_str("2/3").unwrap(), "2/3".to_string());
        let right = Node::literal(&Rational::from_str("3/4").unwrap(), "3/4".to_string());
        let op = Node::operation(OperationType::Mul, vec![left, right]);

        let result = eval(&op).unwrap();
        assert_eq!(result.numerator(), &BigInt::one());
        assert_eq!(result.denominator(), &BigInt::from(2));
    }

    #[test]
    fn test_eval_group() {
        let inner = Node::operation(
            OperationType::Add,
            vec![
                Node::literal(&Rational::from_int(BigInt::from(10)), "10".to_string()),
                Node::literal(&Rational::from_int(BigInt::from(5)), "5".to_string()),
            ],
        );
        let group = Node::group(inner);
        let right = Node::literal(&Rational::from_int(BigInt::from(2)), "2".to_string());
        let mul = Node::operation(OperationType::Mul, vec![group, right]);

        let result = eval(&mul).unwrap();
        assert_eq!(result.numerator(), &BigInt::from(30));
    }

    #[test]
    fn test_eval_power() {
        let base = Node::literal(&Rational::from_int(BigInt::from(2)), "2".to_string());
        let exp = Node::literal(&Rational::from_int(BigInt::from(3)), "3".to_string());
        let pow = Node::operation(OperationType::Pow, vec![base, exp]);

        let result = eval(&pow).unwrap();
        assert_eq!(result.numerator(), &BigInt::from(8));
    }

    #[test]
    fn test_validate_empty_operation() {
        let op = Node::operation(OperationType::Add, vec![]);
        assert!(op.validate().is_err());
    }

    #[test]
    fn test_validate_deep_nesting() {
        let mut node = Node::literal(&Rational::from_int(BigInt::one()), "1".to_string());
        for _ in 0..600 {
            node = Node::group(node);
        }
        assert!(node.validate().is_err());
    }
}
```

---

## Conclusão

A AST e o engine em Rust oferecem:
- **Segurança**: Validação em tempo de construção e avaliação
- **Performance**: Percurso iterativo sem overhead de recursão
- **Clareza**: `enum` com pattern matching exaustivo
- **Serialização**: Suporte a Serde para JSON, CBOR, etc.

A próxima seção detalha o sistema de assinatura e integridade.
