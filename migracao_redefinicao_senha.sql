-- ============================================================================
-- MIGRAÇÃO: tabela de solicitações de redefinição de senha
-- ============================================================================
-- Uma solicitação nasce quando um usuário esquece a senha e informa o e-mail.
-- O Coordenador enxerga todas as solicitações pendentes e pode definir uma nova
-- senha para aquele usuário. Não há envio de e-mail: tudo é tratado dentro do
-- sistema.

CREATE TABLE IF NOT EXISTS public.solicitacoes_redefinicao_senha (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    usuario_id BIGINT REFERENCES public.usuarios(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_redefinicao_email
    ON public.solicitacoes_redefinicao_senha (email);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_redefinicao_status
    ON public.solicitacoes_redefinicao_senha (status);

-- Trigger para manter atualizado_em
CREATE OR REPLACE FUNCTION public.marcar_solicitacao_atualizada()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.atualizado_em := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS solicitacoes_atualizada_em ON public.solicitacoes_redefinicao_senha;

CREATE TRIGGER solicitacoes_atualizada_em
    BEFORE UPDATE ON public.solicitacoes_redefinicao_senha
    FOR EACH ROW
    EXECUTE FUNCTION public.marcar_solicitacao_atualizada();
