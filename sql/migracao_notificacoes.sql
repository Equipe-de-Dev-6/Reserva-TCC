-- ============================================================================
-- MIGRAÇÃO: tabela de notificações dos usuários
-- ============================================================================
--
-- Cada notificação pertence a um usuário da sessão. O app valida título
-- de até 200 caracteres (app.py) e grava somente notificações do dono da
-- sessão; a coluna abaixo acompanha esse limite para não estourar no
-- banco com 22001 (valor longo demais).
--
-- ON DELETE CASCADE aqui é intencional: notificação é descartável quando
-- a conta é excluída. Reservas, ao contrário, usam RESTRICT para não
-- apagar histórico.
--
-- Rode no SQL Editor do Supabase. Pode ser executada mais de uma vez.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notificacoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bancos criados com a versão antiga (VARCHAR(100)) também passam a
-- aceitar o limite validado pela API.
ALTER TABLE public.notificacoes
    ALTER COLUMN titulo TYPE VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario
    ON public.notificacoes (usuario_id, criado_em DESC);
