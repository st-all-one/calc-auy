/**
 * Stub completo para @logtape para permitir execução no browser sem dependências.
 */
export const getLogger = () => ({
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    // Métodos de verificação de nível (necessários para evitar o erro isEnabledFor)
    isEnabledFor: () => false,
    getLevel: () => "none",
});

export type Logger = ReturnType<typeof getLogger>;
