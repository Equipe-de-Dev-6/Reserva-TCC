-- ============================================================================
-- SEGURANÇA: Row Level Security (RLS)
-- ============================================================================
--
-- A API (app.py) acessa o banco com a chave secreta do Supabase
-- (SUPABASE_KEY, que começa com "sb_secret_"). Essa chave ignora o RLS,
-- então o banco continua funcionando normalmente com tudo ligado.
--
-- O ganho é o outro lado: enquanto o RLS estiver desligado, qualquer
-- pessoa com a URL do projeto pode falar direto com o banco pelo
-- PostgREST usando a chave anônima — que é pública por definição — e
-- ler ou alterar as tabelas sem passar pelo login do FastAPI. Ligar o
-- RLS sem nenhuma policy nega esse acesso e não afeta a aplicação.
--
-- Rode depois de migracao_schema.sql, no SQL Editor do Supabase.
-- ============================================================================


-- ===========================================================================
-- 1. Ligar o RLS em todas as tabelas
-- ===========================================================================
--
-- Ligar sem criar policy é o que nega o acesso anônimo. As linhas da
-- aplicação continuam funcionando porque a chave secreta passa por
-- cima do RLS.
--
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrinhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caracteristicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sala_caracteristicas ENABLE ROW LEVEL SECURITY;


-- ===========================================================================
-- 2. Teste
-- ===========================================================================
--
-- Depois de rodar, a checagem é simples. Com a chave anônima do projeto
-- (a "anon public key", no painel em Project Settings -> API), uma
-- consulta tem que responder 401/403 e nenhuma linha:
--
--     curl -H "apikey: <ANON_KEY>" \
--          -H "Authorization: Bearer <ANON_KEY>" \
--          "https://<PROJETO>.supabase.co/rest/v1/usuarios?select=email"
--
-- E com a chave secreta (a SUPABASE_KEY do .env), a mesma consulta tem que
-- continuar devolvendo dados, porque é assim que a API trabalha:
--
--     curl -H "apikey: <SECRET_KEY>" \
--          -H "Authorization: Bearer <SECRET_KEY>" \
--          "https://<PROJETO>.supabase.co/rest/v1/usuarios?select=email"
--
-- Se a segunda deixar de responder, confira se SUPABASE_KEY no .env é a
-- chave secreta e não a anônima.