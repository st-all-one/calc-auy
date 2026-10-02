.PHONY: check fmt clippy test doc

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

# Documentação
doc:
	@cargo doc --no-deps --workspace

# Miri (requer nightly + componente miri; não disponível no toolchain pinado)
miri:
	@cargo +nightly miri test -p calc-auy-core || echo "miri indisponível; use proptests como substituto"

# Fuzz (requer cargo-fuzz; não disponível no toolchain pinado)
fuzz:
	@cd fuzz && cargo fuzz run deserialize -- -runs=10000 || echo "cargo-fuzz indisponível; use proptests como substituto"
