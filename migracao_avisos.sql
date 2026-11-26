-- ============================================================================
-- MIGRAÇÃO: tabela de avisos (compartilhada entre professores e coordenadores)
-- ============================================================================
-- Os avisos publicados por professores ficam visíveis para todos os
-- professores e coordenadores. Não há envio de e-mail: tudo é tratado
-- dentro do sistema.

CREATE TABLE IF NOT EXISTS public.avisos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    data DATE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_avisos_criado_em
    ON public.avisos (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_avisos_usuario_id
    ON public.avisos (usuario_id);

-- Trigger para manter atualizado_em
CREATE OR REPLACE FUNCTION public.marcar_aviso_atualizado()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.atualizado_em := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS avisos_atualizada_em ON public.avisos;

CREATE TRIGGER avisos_atualizada_em
    BEFORE UPDATE ON public.avisos
    FOR EACH ROW
    EXECUTE FUNCTION public.marcar_aviso_atualizado();
