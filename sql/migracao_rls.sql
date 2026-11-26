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
-- Rode depois de migracao_schema.sql, migracao_avisos.sql,
-- migracao_notificacoes.sql e migracao_pendencias.sql, no SQL Editor do
-- Supabase: o ALTER TABLE falha se a tabela ainda não existir.
-- ============================================================================


-- ===========================================================================
-- 1. Ligar o RLS em todas as tabelas
-- ===========================================================================
--
-- Ligar sem criar policy é o que nega o acesso anônimo. As linhas da
-- aplicação continuam funcionando porque a chave secreta passa por
-- cima do RLS.
--
-- login_tentativas guarda endereços IP e pendencias_senhas guarda hashes
-- de novas senhas: deixar essas duas fora seria um buraco, porque um
-- visitante poderia apagar as tentativas para zerar o limite de login.
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrinhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caracteristicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sala_caracteristicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_tentativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendencias_senhas ENABLE ROW LEVEL SECURITY;


-- ===========================================================================
-- 2. Teste
-- ===========================================================================
--
-- Depois de rodar, a checagem é simples. Com a chave anônima do projeto
-- (a "anon public key", no painel em Project Settings -> API), uma
-- consulta normalmente responde 200 com uma lista vazia: sem policy, o
-- Postgres não devolve linha alguma. Um 401/403 só aparece se os grants
-- para "anon" também foram revogados. O importante é nenhuma linha vazar.
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