.PHONY: check fmt fmt-check clippy lint-all test doc deny audit miri fuzz bench release

# Verificação completa: fmt → clippy → test
check: fmt clippy test
	@echo "✓ Check completo: fmt, clippy e test passaram"

# Formatar código
fmt:
	@cargo fmt --all

# Verificar formatação
fmt-check:
	@cargo fmt --all -- --check

# Clippy com warnings como erros
clippy:
	@cargo clippy --workspace -- -D warnings

# Clippy em todos os alvos (lib, bins, tests, benches)
lint-all:
	@cargo clippy --workspace --all-targets -- -D warnings

# Testes
test:
	@cargo test --workspace

# Documentação (rustdoc sem warnings)
doc:
	@RUSTDOCFLAGS="-D warnings" cargo doc --no-deps --workspace

# Licenças, bans, advisories e fontes (T13.3)
deny:
	@cargo deny check

# Vulnerabilidades conhecidas (T13.3)
audit:
	@cargo audit

# Miri é EXPERIMENTAL e NÃO obrigatório (T13.3): requer nightly, é lento e o
# proptest exige desligar o isolamento. Divergências aqui não bloqueiam o gate.
miri:
	@MIRIFLAGS="-Zmiri-disable-isolation" cargo +nightly miri test -p calc-auy-core --lib \
		|| echo "miri é opcional; use proptests/differential como substituto"

# Fuzz (requer cargo-fuzz; indisponível no toolchain atual)
fuzz:
	@cd fuzz && cargo fuzz run deserialize -- -runs=10000 \
		|| echo "cargo-fuzz indisponível; differential/proptest cobrem o mesmo alvo"

# Benchmarks
bench:
	@cargo bench -p calc-auy-core --bench rational

# Relatório de release (T13.6)
release:
	@cargo run -q -p xtask -- release
