-- ============================================================================
-- MIGRAÇÃO: ajustes de esquema exigidos pelo código da aplicação
-- ============================================================================
--
-- Este arquivo reúne em um lugar só as correções de estrutura que o
-- código (app.py, model.py, reservas.js e as telas) já exige, mas
-- que o esquema original não garante.
--
-- Rode no SQL Editor do Supabase (pode rodar mais de uma vez: todas as
-- instruções checam o estado antes de mudar).
--
-- O que cada bloco corrige:
--
--   1. reservas: colunas que o formulário preenche  (migracao_reservas.sql
--      continua existindo, mas este bloco já traz o mesmo efeito)
--   2. reservas: sala_id deixa de ser obrigatório, porque a reserva pode
--      ser de um laboratório, gabinete, carrinho ou notebook
--   3. reservas: status, data_inicio e data_fim passam a ser obrigatórios
--      e aceitam só os valores que as telas conhecem
--   4. reservas: atualizado_em passa a se atualizar sozinho
--   5. reservas: índice para a ordenação das telas
--   6. sala_caracteristicas: sala_id deixa de ser identidade, o que
--      impedia a tabela de junção de receber qualquer linha
--   7. usuarios: cargo passa a ter valores controlados
--   8. salas e carrinhos: colunas que a API lê sem aceitar nulo
--
-- ============================================================================


-- ===========================================================================
-- 1. Colunas usadas pelo formulário de reserva
-- ===========================================================================

ALTER TABLE public.reservas
    ADD COLUMN IF NOT EXISTS categoria VARCHAR(60),
    ADD COLUMN IF NOT EXISTS item VARCHAR(100),
    ADD COLUMN IF NOT EXISTS professor VARCHAR(60),
    ADD COLUMN IF NOT EXISTS curso VARCHAR(100),
    ADD COLUMN IF NOT EXISTS motivo TEXT,
    ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Registros antigos não podem ficar sem dono de status nem sem horário,
-- por isso o DEFAULT só vale para linhas novas: o UPDATE abaixo é o que
-- preenche as que já existiam.
ALTER TABLE public.reservas
    ALTER COLUMN status SET DEFAULT 'aguardando';

UPDATE public.reservas
    SET status = 'aguardando'
    WHERE status IS NULL;

ALTER TABLE public.reservas
    ALTER COLUMN status SET NOT NULL;

-- O mesmo para as datas: nenhuma tela sabe exibir uma reserva sem data.
UPDATE public.reservas
    SET data_inicio = COALESCE(data_inicio, criado_em, NOW()),
        data_fim = COALESCE(data_fim, data_inicio, criado_em, NOW())
    WHERE data_inicio IS NULL OR data_fim IS NULL;

ALTER TABLE public.reservas
    ALTER COLUMN data_inicio SET NOT NULL,
    ALTER COLUMN data_fim SET NOT NULL;

-- Só estas quatro respostas existem. Sem esta trava, um INSERT direto
-- pelo painel do Supabase grava um status que nenhuma tela reconhece e a
-- reserva some dos filtros.
--
-- Os dois nomes aparecem no DROP porque uma versão anterior deste
-- arquivo criou a constraint com o nome em inglês
-- ("reservations_status_check"). Sem o DROP dos dois, quem já rodou a
-- versão antiga receberia "constraint already exists" na segunda vez.
ALTER TABLE public.reservas
    DROP CONSTRAINT IF EXISTS reservas_status_check,
    DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE public.reservas
    ADD CONSTRAINT reservas_status_check
    CHECK (status IN ('aguardando', 'aprovada', 'negada', 'cancelada'));


-- ===========================================================================
-- 2. A reserva não é obrigatoriamente de uma sala
-- ===========================================================================
--
-- A tela de escolha oferece sala, laboratório, gabinete, carrinho e
-- notebook. Com sala_id NOT NULL, qualquer reserva desses outros tipos
-- era rejeitada pelo banco.
--
-- A trava abaixo impede o absurdo (os três recursos na mesma reserva),
-- mas não exige sala_id: gabinete e carrinho ainda não têm cadastro
-- próprio, e a reserva guarda o nome escolhido em "item". Quando essas
-- telas passarem a enviar o id, basta trocar o <= 1 por um = 1.
--
ALTER TABLE public.reservas
    ALTER COLUMN sala_id DROP NOT NULL;

ALTER TABLE public.reservas
    DROP CONSTRAINT IF EXISTS reservas_recurso_check;

ALTER TABLE public.reservas
    ADD CONSTRAINT reservas_recurso_check
    CHECK (
        (sala_id IS NOT NULL)::int
      + (notebooks_id IS NOT NULL)::int
      + (carrinho_id IS NOT NULL)::int <= 1
    );

-- Uma mesma sala não aceita duas reservas com horário sobreposto. O
-- EXCLUDE só considera as reservas que ainda valem; as canceladas e as
-- recusadas liberam o horário para outro professor.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.reservas
    DROP CONSTRAINT IF EXISTS reservas_sem_choque;

ALTER TABLE public.reservas
    ADD CONSTRAINT reservas_sem_choque
    EXCLUDE USING gist (
        sala_id WITH =,
        tstzrange(data_inicio, data_fim) WITH &&
    )
    WHERE (status IN ('aguardando', 'aprovada'));


-- ===========================================================================
-- 3. "atualizado_em" se manter sozinho
-- ===========================================================================
--
-- DEFAULT CURRENT_TIMESTAMP só vale na inserção. Quem edita a reserva pelo
-- painel do Supabase deixaria a data da criação, e é essa data que a tela
-- de aprovação mostra. O trigger resolve para qualquer autor.
--
CREATE OR REPLACE FUNCTION public.marcar_reserva_atualizada()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.atualizado_em := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservas_atualizada_em ON public.reservas;

CREATE TRIGGER reservas_atualizada_em
    BEFORE UPDATE ON public.reservas
    FOR EACH ROW
    EXECUTE FUNCTION public.marcar_reserva_atualizada();


-- ===========================================================================
-- 4. Índices
-- ===========================================================================
--
-- A tela de reservas ordena por data_inicio e a de aprovação filtra por
-- status: sem estes índices, cada carregamento vira varredura da tabela.
-- Postgres não cria índice sozinho em coluna de chave estrangeira.
--
CREATE INDEX IF NOT EXISTS idx_reservas_data_inicio
    ON public.reservas (data_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_reservas_status
    ON public.reservas (status);

CREATE INDEX IF NOT EXISTS idx_reservas_usuario
    ON public.reservas (usuario_id);

CREATE INDEX IF NOT EXISTS idx_reservas_sala
    ON public.reservas (sala_id);

CREATE INDEX IF NOT EXISTS idx_reservas_criado_em
    ON public.reservas (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_sala_caracteristicas_sala
    ON public.sala_caracteristicas (sala_id);


-- ===========================================================================
-- 5. A tabela de junção sala x característica
-- ===========================================================================
--
-- sala_caracteristicas.sala_id é parte da chave primária composta, ou
-- seja, um id comum vindo de public.salas. Se a coluna estivesse
-- declarada como identity, não existiria INSERT possível: a identidade
-- recusa valor informado e geraria um número que não corresponde a
-- nenhuma sala.
--
-- O arquivo reserva-Tcc.sql mostra a coluna como identity, mas ele é
-- uma referência ("não deve ser executado") e não sempre bate com o
-- banco real. Por isso esta seção pergunta ao catálogo em vez de
-- assumir: se a coluna já for comum, não há o que fazer.
--
DO $$
DECLARE
    tem_identidade boolean;
    tem_padrao boolean;
    linhas_existentes bigint;
BEGIN
    SELECT
        (a.attidentity <> ''),
        (a.atthasdef)
    INTO tem_identidade, tem_padrao
    FROM pg_attribute a
    WHERE a.attrelid = 'public.sala_caracteristicas'::regclass
      AND a.attname = 'sala_id'
      AND NOT a.attisdropped;

    SELECT COUNT(*) INTO linhas_existentes FROM public.sala_caracteristicas;

    IF NOT tem_identidade AND NOT tem_padrao THEN
        -- Já é uma coluna comum, que é o formato correto para uma
        -- tabela de junção. Nada a fazer.
        RAISE NOTICE 'sala_caracteristicas.sala_id já é uma coluna comum.';

    ELSE
        IF linhas_existentes > 0 THEN
            RAISE EXCEPTION
                'sala_caracteristicas tem % linha(s) e a coluna sala_id é gerada automaticamente. Confira as linhas antes de continuar.', linhas_existentes;
        END IF;

        IF tem_identidade THEN
            ALTER TABLE public.sala_caracteristicas
                ALTER COLUMN sala_id DROP IDENTITY;
        END IF;

        -- identity deixa uma sequência junto, que também tem de sair.
        ALTER TABLE public.sala_caracteristicas
            ALTER COLUMN sala_id DROP DEFAULT;
    END IF;
END $$;

ALTER TABLE public.sala_caracteristicas
    ALTER COLUMN sala_id SET NOT NULL;


-- ===========================================================================
-- 6. Cargo com valores controlados
-- ===========================================================================
--
-- O banco guarda 'Professor' e 'Coordenador' (com inicial maiúscula),
-- que são os valores que a tela de cadastro oferece.
--
UPDATE public.usuarios
    SET cargo = 'Professor'
    WHERE cargo IS NULL
       OR lower(btrim(cargo)) NOT IN ('professor', 'coordenador');

ALTER TABLE public.usuarios
    ALTER COLUMN cargo SET DEFAULT 'Professor';

ALTER TABLE public.usuarios
    DROP CONSTRAINT IF EXISTS usuarios_cargo_check;

ALTER TABLE public.usuarios
    ADD CONSTRAINT usuarios_cargo_check
    CHECK (cargo IN ('Professor', 'Coordenador'));

-- O login confere o e-mail depois de normalizar, e a busca de duplicidade
-- também. Gravar o e-mail já normalizado evita duas contas que diferem
-- só por maiúsculas ou espaços.
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email_normalizado
    ON public.usuarios (lower(btrim(email)));


-- ===========================================================================
-- 7. Colunas que a API lê sem aceitar nulo
-- ===========================================================================
--
-- model.Sala e model.Carrinho exigem nome, disponibilidade e, na sala,
-- característica e histórico. Um único NULL nestas colunas transformava
-- GET /salas em erro 500.
--
UPDATE public.salas SET nome = 'Sem nome' WHERE nome IS NULL;
UPDATE public.salas SET caracteristica = '' WHERE caracteristica IS NULL;
UPDATE public.salas SET disponibilidade = TRUE WHERE disponibilidade IS NULL;
UPDATE public.salas SET historico = '{}'::json WHERE historico IS NULL;

ALTER TABLE public.salas
    ALTER COLUMN nome SET NOT NULL,
    ALTER COLUMN caracteristica SET NOT NULL,
    ALTER COLUMN disponibilidade SET NOT NULL,
    ALTER COLUMN historico SET NOT NULL;

ALTER TABLE public.salas
    ALTER COLUMN disponibilidade SET DEFAULT TRUE;

-- O histórico fica em "{}" quando a sala nunca foi usada, que é o que a
-- API já esperava; a coluna só precisa deixar de aceitar nulo.
ALTER TABLE public.salas
    ALTER COLUMN historico SET DEFAULT '{}'::json;

UPDATE public.carrinhos SET nome = 'Sem nome' WHERE nome IS NULL;
UPDATE public.carrinhos SET disponibilidade = TRUE WHERE disponibilidade IS NULL;

ALTER TABLE public.carrinhos
    ALTER COLUMN nome SET NOT NULL,
    ALTER COLUMN disponibilidade SET NOT NULL,
    ALTER COLUMN disponibilidade SET DEFAULT TRUE;

-- O bcrypt sempre gera 60 caracteres, então 150 só ocupava espaço.
ALTER TABLE public.usuarios
    DROP CONSTRAINT IF EXISTS usuarios_senha_check;

ALTER TABLE public.usuarios
    ADD CONSTRAINT usuarios_senha_check
    CHECK (senha IS NULL OR char_length(senha) BETWEEN 59 AND 61);

-- NOT NULL depois do UPDATE, para a trava não atrapalhar a limpeza acima.
ALTER TABLE public.usuarios
    ALTER COLUMN nome SET NOT NULL,
    ALTER COLUMN email SET NOT NULL;

-- E-mail com formato mínimo e sem espaço nas pontas, que é como o login
-- normaliza antes de procurar.
ALTER TABLE public.usuarios
    DROP CONSTRAINT IF EXISTS usuarios_email_formato;

ALTER TABLE public.usuarios
    ADD CONSTRAINT usuarios_email_formato
    CHECK (
        email = btrim(email)
        AND email LIKE '%_@_%._%'
        AND char_length(email) <= 100
    );


-- ===========================================================================
-- 9. Quais salas podem ser reservadas vira dado do banco
-- ===========================================================================
--
-- A lista de salas reserváveis vivia escrita em Python (a constante
-- SALAS_RESERVAVEIS), e mudar a oferta de salas da escola exigia
-- alterar e republicar o código. Com a coluna, quem muda é o
-- Coordenador, na tela de gerenciamento de salas.
--
-- A coluna nasce marcada com os mesmos ids que a lista antiga aceitava,
-- para que a migração não mude o comportamento de quem já usa.
--
ALTER TABLE public.salas
    ADD COLUMN IF NOT EXISTS reservavel BOOLEAN;

UPDATE public.salas
    SET reservavel = TRUE
    WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
                 17, 18, 19, 24, 25, 55, 56, 57, 89, 90, 91);

-- Sala nova não entra na oferta sozinha: alguém marca a caixa de
-- propósito na tela de gerenciamento.
ALTER TABLE public.salas
    ALTER COLUMN reservavel SET DEFAULT FALSE;

UPDATE public.salas
    SET reservavel = FALSE
    WHERE reservavel IS NULL;

ALTER TABLE public.salas
    ALTER COLUMN reservavel SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_salas_reservavel
    ON public.salas (reservavel);


-- ===========================================================================
-- 10. Tentativas de login
-- ===========================================================================
--
-- O limite de tentativas ficava na memória do processo. Com mais de uma
-- instância da aplicação (uvicorn --workers), cada uma contaria por conta
-- própria e o limite valeria só para quem caísse nela. Guardando no banco,
-- a contagem é a mesma para todo mundo.
--
-- Só entram as tentativas que falharam: uma entrada correta não gasta cota.
--
CREATE TABLE IF NOT EXISTS public.login_tentativas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    endereco TEXT NOT NULL,
    tentativa TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- A consulta do login filtra por endereço e conta o que está na janela de
-- cinco minutos; este índice é o que faz essa contagem sair barato.
CREATE INDEX IF NOT EXISTS idx_login_tentativas_endereco
    ON public.login_tentativas (endereco, tentativa DESC);


-- ===========================================================================
-- 8. Excluir uma sala não pode deixar reserva órfã
-- ===========================================================================
--
-- Sem ON DELETE, apagar uma sala que tem histórico falha com erro de
-- chave estrangeira. Nenhuma das duas opções é silenciosa: deixar as
-- reservas órfãs quebra a tela de aprovação; apagar o histórico perde
-- informação. O padrão é negar, e a API trata a recusa como erro
-- legível.
--
-- As duas constraints vivem em public.reservas, que é onde estão as
-- colunas sala_id e usuario_id.
--
ALTER TABLE public.reservas
    DROP CONSTRAINT IF EXISTS reservas_sala_id_fkey;

ALTER TABLE public.reservas
    ADD CONSTRAINT reservas_sala_id_fkey
        FOREIGN KEY (sala_id) REFERENCES public.salas(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;

ALTER TABLE public.reservas
    DROP CONSTRAINT IF EXISTS reservas_usuario_id_fkey;

ALTER TABLE public.reservas
    ADD CONSTRAINT reservas_usuario_id_fkey
        FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE;