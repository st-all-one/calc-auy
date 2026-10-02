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
