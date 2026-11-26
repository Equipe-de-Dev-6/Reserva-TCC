-- ===========================================================================
-- MIGRAÇÃO: colunas usadas pela API de reservas
-- ===========================================================================
-- A tabela "reservas" foi criada sem os campos que o formulário do
-- professor preenche. Esta migração acrescenta esses campos.
--
-- Rode este arquivo no SQL Editor do Supabase (uma vez).
-- As instruções usam IF NOT EXISTS, então rodar de novo não causa erro.
--
-- Depois de rodar, estas rotas da API passam a funcionar:
--   POST   /reservas
--   GET    /reservas
--   PATCH  /reservas/{id}/decisao
--
-- Este arquivo é mantido por compatibilidade com instalações antigas.
-- migracao_schema.sql (seção 1) acrescenta as mesmas colunas já com
-- TIMESTAMPTZ, que é o tipo que o banco usa para as datas da reserva.
-- ===========================================================================

ALTER TABLE public.reservas
    ADD COLUMN IF NOT EXISTS categoria VARCHAR(60),
    ADD COLUMN IF NOT EXISTS item VARCHAR(100),
    ADD COLUMN IF NOT EXISTS professor VARCHAR(60),
    ADD COLUMN IF NOT EXISTS curso VARCHAR(100),
    ADD COLUMN IF NOT EXISTS motivo TEXT,
    ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Uma instalação antiga pode ter criado as colunas sem fuso horário.
-- Converter para TIMESTAMPTZ mantém o mesmo instante e alinha o tipo ao
-- das colunas data_inicio/data_fim.
ALTER TABLE public.reservas
    ALTER COLUMN criado_em TYPE TIMESTAMPTZ,
    ALTER COLUMN atualizado_em TYPE TIMESTAMPTZ;

-- O status nasce como "aguardando", porque a reserva só é liberada
-- depois que o administrador responde em /reservas/{id}/decisao.
ALTER TABLE public.reservas
    ALTER COLUMN status SET DEFAULT 'aguardando';

-- Índice para a tela de aprovação, que filtra por status e ordena
-- pelas reservas mais recentes.
CREATE INDEX IF NOT EXISTS idx_reservas_status
    ON public.reservas (status);

CREATE INDEX IF NOT EXISTS idx_reservas_usuario
    ON public.reservas (usuario_id);