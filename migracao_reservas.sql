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
-- ===========================================================================

ALTER TABLE reservas
    ADD COLUMN IF NOT EXISTS categoria VARCHAR(60),
    ADD COLUMN IF NOT EXISTS item VARCHAR(100),
    ADD COLUMN IF NOT EXISTS professor VARCHAR(60),
    ADD COLUMN IF NOT EXISTS curso VARCHAR(100),
    ADD COLUMN IF NOT EXISTS motivo TEXT,
    ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- O status nasce como "aguardando", porque a reserva só é liberada
-- depois que o administrador responde em /reservas/{id}/decisao.
ALTER TABLE reservas
    ALTER COLUMN status SET DEFAULT 'aguardando';

-- Índice para a tela de aprovação, que filtra por status e ordena
-- pelas reservas mais recentes.
CREATE INDEX IF NOT EXISTS idx_reservas_status
    ON reservas (status);

CREATE INDEX IF NOT EXISTS idx_reservas_usuario
    ON reservas (usuario_id);