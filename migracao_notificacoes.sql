CREATE TABLE IF NOT EXISTS public.notificacoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(100) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario
    ON public.notificacoes (usuario_id, criado_em DESC);