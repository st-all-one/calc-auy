//! O tipo [`Calculation`] e a API fluente com *typestate*.

use std::fmt;
use std::marker::PhantomData;

use smallvec::SmallVec;

use calc_auy_core::{
    AstBuilder, CalcAuyError, CustodyVerifier, Digest, FlatAst, MetaValue, NodeId, OperationType,
    Rational, SignaturePayload, VerifiedAst, commit as core_commit,
};
use calc_auy_output::{Output, OutputOptions};

use crate::config::InstanceConfig;
use crate::context::ContextLink;
use crate::into_rational::IntoRational;
use crate::state::{Committed, CommittedData, Draft, DraftData, State, Verified};

/// Cálculo cujo ciclo de vida é codificado no sistema de tipos.
///
/// O parâmetro `S` é um dos estados [`Draft`], [`Committed`] ou [`Verified`].
/// Métodos válidos apenas em um estado não existem nos demais, de modo que
/// estados inválidos são impossíveis em tempo de compilação.
///
/// # Examples
///
/// ```
/// use calc_auy_builder::{Calculation, InstanceConfig};
/// use calc_auy_core::Salt;
///
/// let config = InstanceConfig::new(Salt::new("demo"));
/// let draft = Calculation::from(&config, 10).unwrap().add(5).unwrap();
/// let json = draft.hibernate().unwrap();
/// let _reopened = Calculation::hydrate(&config, &json).unwrap();
/// ```
pub struct Calculation<'limits, S: State> {
    /// Dados específicos do estado.
    data: S::Data<'limits>,
    /// Configuração da instância.
    config: &'limits InstanceConfig,
    /// Marca o parâmetro de estado (sem custo em memória).
    _state: PhantomData<S>,
}

impl<S: State> fmt::Debug for Calculation<'_, S> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "Calculation<{}>", S::NAME)
    }
}

impl<'limits> Calculation<'limits, Draft> {
    /// Inicia um cálculo a partir de um valor ingerido.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a conversão falhar ou exceder os limites.
    pub fn from(
        config: &'limits InstanceConfig,
        value: impl IntoRational,
    ) -> Result<Self, CalcAuyError> {
        let rational = value.into_rational(config.limits())?;
        let mut builder = AstBuilder::new(config.limits());
        let root = builder.literal(rational.clone(), rational.to_string())?;
        Ok(Self::wrap(DraftData { builder, root }, config))
    }

    /// Inicia um cálculo a partir de uma AST já construída.
    #[must_use]
    pub fn from_flat_ast(config: &'limits InstanceConfig, ast: FlatAst) -> Self {
        let (builder, root) = AstBuilder::from_ast(ast, config.limits());
        Self::wrap(DraftData { builder, root }, config)
    }

    /// Reabre um cálculo previamente hibernado.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se o JSON for inválido ou exceder os limites.
    pub fn hydrate(config: &'limits InstanceConfig, json: &str) -> Result<Self, CalcAuyError> {
        let ast = FlatAst::from_json_str(json, config.limits())?;
        Ok(Self::from_flat_ast(config, ast))
    }

    /// Cria um cálculo a partir dos dados e configuração.
    const fn wrap(data: DraftData<'limits>, config: &'limits InstanceConfig) -> Self {
        Self {
            data,
            config,
            _state: PhantomData,
        }
    }

    /// Aplica uma operação binária com um novo operando.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a conversão falhar ou exceder os limites.
    #[allow(
        clippy::should_implement_trait,
        reason = "API fluente espelha a semântica do produto"
    )]
    fn binary(mut self, op: OperationType, rhs: impl IntoRational) -> Result<Self, CalcAuyError> {
        let value = rhs.into_rational(self.config.limits())?;
        let root = self.data.root;
        let rhs_id = self
            .data
            .builder
            .literal(value.clone(), value.to_string())?;
        self.data.root = self.data.builder.operation(op, &[root, rhs_id])?;
        Ok(self)
    }

    /// Soma um operando.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a conversão falhar ou exceder os limites.
    #[allow(
        clippy::should_implement_trait,
        reason = "API fluente espelha a semântica do produto"
    )]
    pub fn add(self, rhs: impl IntoRational) -> Result<Self, CalcAuyError> {
        self.binary(OperationType::Add, rhs)
    }

    /// Subtrai um operando.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a conversão falhar ou exceder os limites.
    #[allow(
        clippy::should_implement_trait,
        reason = "API fluente espelha a semântica do produto"
    )]
    pub fn sub(self, rhs: impl IntoRational) -> Result<Self, CalcAuyError> {
        self.binary(OperationType::Sub, rhs)
    }

    /// Multiplica por um operando.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a conversão falhar ou exceder os limites.
    #[allow(
        clippy::should_implement_trait,
        reason = "API fluente espelha a semântica do produto"
    )]
    pub fn mul(self, rhs: impl IntoRational) -> Result<Self, CalcAuyError> {
        self.binary(OperationType::Mul, rhs)
    }

    /// Divide por um operando.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a conversão falhar ou exceder os limites.
    #[allow(
        clippy::should_implement_trait,
        reason = "API fluente espelha a semântica do produto"
    )]
    pub fn div(self, rhs: impl IntoRational) -> Result<Self, CalcAuyError> {
        self.binary(OperationType::Div, rhs)
    }

    /// Eleva a um expoente.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a conversão falhar ou exceder os limites.
    pub fn pow(self, rhs: impl IntoRational) -> Result<Self, CalcAuyError> {
        self.binary(OperationType::Pow, rhs)
    }

    /// Aplica o resto da divisão.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a conversão falhar ou exceder os limites.
    pub fn mod_(self, rhs: impl IntoRational) -> Result<Self, CalcAuyError> {
        self.binary(OperationType::Mod, rhs)
    }

    /// Aplica a divisão inteira.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a conversão falhar ou exceder os limites.
    pub fn div_int(self, rhs: impl IntoRational) -> Result<Self, CalcAuyError> {
        self.binary(OperationType::DivInt, rhs)
    }

    /// Agrupa a raiz atual (parênteses).
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se um limite for excedido.
    pub fn group(mut self) -> Result<Self, CalcAuyError> {
        let root = self.data.root;
        self.data.root = self.data.builder.group(root)?;
        Ok(self)
    }

    /// Define uma chave de metadata na raiz atual.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se o limite de bytes for excedido.
    pub fn set_metadata(
        mut self,
        key: impl Into<Box<str>>,
        value: MetaValue,
    ) -> Result<Self, CalcAuyError> {
        let root = self.data.root;
        self.data.builder.insert_metadata(root, key, value)?;
        Ok(self)
    }

    /// Adiciona o cálculo atual a contextos anteriores, verificáveis.
    ///
    /// A raiz atual é envolvida em um nó de controle usando o rótulo/assinatura
    /// da configuração; cada elo é envolvido em um controle próprio.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se um limite for excedido.
    pub fn cross_context_add(mut self, links: &[ContextLink]) -> Result<Self, CalcAuyError> {
        let current_root = self.data.root;
        let label = self.config.context_label().to_string();
        let signature = self.config.context_signature().to_string();
        let strategy = self.config.round_strategy();
        let current = self
            .data
            .builder
            .control(current_root, label, signature, strategy)?;

        let mut operands: SmallVec<[NodeId; 4]> = SmallVec::new();
        operands.push(current);
        for link in links {
            let literal = self
                .data
                .builder
                .literal(link.value.clone(), link.value.to_string())?;
            let control = self.data.builder.control(
                literal,
                link.label.clone(),
                link.signature.clone(),
                link.round_strategy,
            )?;
            operands.push(control);
        }
        self.data.root = self
            .data
            .builder
            .operation(OperationType::CrossContextAdd, &operands)?;
        Ok(self)
    }

    /// Finaliza o cálculo: verifica a custódia, avalia, arredonda e assina.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a custódia, a avaliação, os limites ou a
    /// assinatura falharem.
    pub fn commit(
        self,
        verifier: &dyn CustodyVerifier,
    ) -> Result<Calculation<'limits, Committed>, CalcAuyError> {
        let config = self.config;
        let DraftData { builder, root } = self.data;
        let ast = builder.finish(root)?;
        let custody: VerifiedAst = ast.verify_custody(verifier, config.limits())?;
        let result = core_commit(
            custody,
            config.round_strategy(),
            config.decimals(),
            config.salt(),
            config.limits(),
        )?;
        Ok(Calculation {
            data: CommittedData { result },
            config,
            _state: PhantomData,
        })
    }

    /// Hiberna o rascunho como JSON (AST canônica), preservando os limites.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a serialização falhar.
    pub fn hibernate(self) -> Result<String, CalcAuyError> {
        let DraftData { builder, root } = self.data;
        let ast = builder.finish(root)?;
        ast.to_json_string()
    }
}

impl<'limits> Calculation<'limits, Committed> {
    /// Retorna o resultado final arredondado.
    #[must_use]
    pub const fn result(&self) -> &Rational {
        self.data.result.result()
    }

    /// Retorna a assinatura.
    #[must_use]
    pub const fn signature(&self) -> Digest {
        self.data.result.signature()
    }

    /// Retorna o payload assinado.
    #[must_use]
    pub const fn payload(&self) -> &SignaturePayload {
        self.data.result.payload()
    }

    /// Retorna o resultado selado do núcleo.
    #[must_use]
    pub const fn committed(&self) -> &calc_auy_core::Committed {
        &self.data.result
    }

    /// Cria uma visão de saída sobre o resultado selado.
    #[must_use]
    pub const fn output(&self, options: OutputOptions) -> Output<'_> {
        Output::new(&self.data.result, options)
    }

    /// Serializa o payload assinado como JSON.
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a serialização falhar.
    pub fn to_json(&self) -> Result<String, CalcAuyError> {
        serde_json::to_string(self.data.result.payload()).map_err(|error| {
            CalcAuyError::SerializationError {
                message: error.to_string(),
            }
        })
    }

    /// Reconfere a custódia e promove para [`Verified`].
    ///
    /// # Errors
    ///
    /// Retorna [`CalcAuyError`] se a custódia for inválida.
    pub fn verify(
        self,
        verifier: &dyn CustodyVerifier,
    ) -> Result<Calculation<'limits, Verified>, CalcAuyError> {
        let config = self.config;
        let data = self.data;
        let ast = data.result.payload().ast.clone();
        let _custody: VerifiedAst = ast.verify_custody(verifier, config.limits())?;
        Ok(Calculation {
            data,
            config,
            _state: PhantomData,
        })
    }
}

impl Calculation<'_, Verified> {
    /// Retorna o resultado final arredondado.
    #[must_use]
    pub const fn result(&self) -> &Rational {
        self.data.result.result()
    }

    /// Retorna a assinatura.
    #[must_use]
    pub const fn signature(&self) -> Digest {
        self.data.result.signature()
    }

    /// Retorna o payload assinado.
    #[must_use]
    pub const fn payload(&self) -> &SignaturePayload {
        self.data.result.payload()
    }

    /// Retorna o resultado selado do núcleo.
    #[must_use]
    pub const fn committed(&self) -> &calc_auy_core::Committed {
        &self.data.result
    }

    /// Cria uma visão de saída sobre o resultado selado.
    #[must_use]
    pub const fn output(&self, options: OutputOptions) -> Output<'_> {
        Output::new(&self.data.result, options)
    }
}
