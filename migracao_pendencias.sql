-- ============================================================================
-- MIGRAÇÃO: pedidos de troca de senha pendentes de aprovação
-- ============================================================================
--
-- O fluxo "esqueceu a senha" não envia e-mail nem troca a senha na hora:
-- /senha/solicitar grava o hash da nova senha nesta tabela e devolve o id
-- do pedido; /pendencias e /pendencias/{id}/aceitar ficam com o
-- Coordenador, que decide quando a troca acontece.
--
-- Sem esta tabela, essas rotas do app.py respondem erro do PostgREST.
-- Rode no SQL Editor do Supabase, depois de migracao_schema.sql e antes
-- de migracao_rls.sql. Pode ser executada mais de uma vez.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pendencias_senhas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    -- Nunca a senha em texto: o app já grava o hash bcrypt aqui.
    nova_senha_hash VARCHAR(100) NOT NULL,
    solicitado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolvido_em TIMESTAMPTZ,
    -- Quem aprovou/recusou. Se o coordenador for excluído, o histórico do
    -- pedido continua, mas perde a referência ao usuário apagado.
    resolvido_por BIGINT REFERENCES public.usuarios(id) ON DELETE SET NULL
);

-- Somente estes três valores são usados pelas rotas e pelas telas.
ALTER TABLE public.pendencias_senhas
    DROP CONSTRAINT IF EXISTS pendencias_senhas_status_check;

ALTER TABLE public.pendencias_senhas
    ADD CONSTRAINT pendencias_senhas_status_check
    CHECK (status IN ('pendente', 'aprovada', 'negada'));

-- /pendencias filtra por status e o coordenador consulta a lista inteira.
CREATE INDEX IF NOT EXISTS idx_pendencias_senhas_status
    ON public.pendencias_senhas (status, solicitado_em DESC);

CREATE INDEX IF NOT EXISTS idx_pendencias_senhas_usuario
    ON public.pendencias_senhas (usuario_id);
