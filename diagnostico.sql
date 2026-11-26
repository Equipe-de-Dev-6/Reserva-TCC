-- ============================================================================
-- DIAGNÓSTICO: como o banco está de verdade
-- ============================================================================
--
-- Consulta somente de leitura. Não altera nada.
--
-- Serve para conferir, antes de rodar migracao_schema.sql, o que
-- existe de fato: as migrations escritas a partir do arquivo
-- reserva-Tcc.sql podem esbarrar em diferença, porque aquele arquivo é
-- uma referência ("não deve ser executado") e o banco real pode ter
-- mudado desde então.
--
-- Como usar: SQL Editor -> New query -> cola tudo -> Run. Depois
-- compare com o que a migração espera.
--
-- ============================================================================


-- 1) Colunas que a aplicação depende de.
--    O foco é "reservavel" e "login_tentativas", que são as duas
--    adições mais recentes; se aparecerem aqui, a migração já rodou.
SELECT
    table_name AS tabela,
    column_name AS coluna,
    data_type AS tipo,
    is_nullable AS aceita_nulo,
    is_identity AS identidade,
    column_default AS padrao
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
      'salas', 'usuarios', 'reservas', 'carrinhos',
      'sala_caracteristicas', 'login_tentativas'
  )
ORDER BY table_name, ordinal_position;


-- 2) Constraints: mostra nome, tabela e definição. É daqui que se vê
--    se a trava de status e a de horário sobreposto já existem.
SELECT
    conrelid::regclass::text AS tabela,
    conname AS nome,
    pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conrelid::regclass::text IN (
      'salas', 'usuarios', 'reservas', 'carrinhos', 'sala_caracteristicas'
  )
ORDER BY tabela, nome;


-- 3) Índices: confere se a trava de horário (btree_gist) e os índices
--    das consultas de tela existem.
SELECT
    tablename AS tabela,
    indexname AS indice,
    indexdef AS definicao
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- 4) Triggers da aplicação (o que atualiza "atualizado_em").
SELECT
    tgrelid::regclass::text AS tabela,
    tgname AS trigger,
    pg_get_triggerdef(oid) AS definicao
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgrelid::regclass::text LIKE 'public.%'
ORDER BY 1, 2;


-- 5) Row Level Security: "seguro = sim" em todas as tabelas é o que
--    fecha o acesso anônimo direto ao banco.
SELECT
    relname AS tabela,
    relrowsecurity AS rls_ligado,
    relforcerowsecurity AS rls_forcado
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
ORDER BY relname;


-- 6) Quantas linhas existem. A trava de horário sobreposto só pode ser
--    criada se a tabela estiver vazia ou sem dados conflitantes.
SELECT
    'salas' AS tabela, COUNT(*) AS linhas FROM public.salas
UNION ALL SELECT 'usuarios', COUNT(*) FROM public.usuarios
UNION ALL SELECT 'reservas', COUNT(*) FROM public.reservas
UNION ALL SELECT 'carrinhos', COUNT(*) FROM public.carrinhos
UNION ALL SELECT 'sala_caracteristicas', COUNT(*) FROM public.sala_caracteristicas
UNION ALL SELECT 'notebooks', COUNT(*) FROM public.notebooks
ORDER BY 1;