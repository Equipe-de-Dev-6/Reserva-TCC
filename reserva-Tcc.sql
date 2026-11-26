-- AVISO: este arquivo é apenas documentação do esquema de referência.
-- Não deve ser executado: não usa IF NOT EXISTS e algumas definições
-- abaixo são legado que as migrations corrigem. Para preparar o banco,
-- siga a ordem de migrations no README.md.
--
-- Legado corrigido por migracao_schema.sql:
--   * sala_caracteristicas.sala_id é uma FK, não uma identity;
--   * reservas.sala_id pode ser nulo (gabinete/carrinho não têm cadastro);
--   * status e datas passam a ser obrigatórios e controlados;
--   * as FKs de reservas usam ON DELETE RESTRICT.
-- Legado corrigido por migracao_pendencias.sql: a tabela de troca de
-- senha usada por app.py não aparece nesta referência.
-- WARNING original: this schema is for context only and is not meant to be run.

CREATE TABLE public.salas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome character varying,
  caracteristica character varying,
  disponibilidade boolean,
  historico json,
  CONSTRAINT salas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.usuarios (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome character varying NOT NULL,
  email character varying UNIQUE,
  senha character varying,
  cargo character varying,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id)
);
CREATE TABLE public.caracteristicas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome character varying NOT NULL UNIQUE,
  CONSTRAINT caracteristicas_pkey PRIMARY KEY (id)
);
-- Legado: sala_id é a FK para public.salas; a migration remove o IDENTITY.
CREATE TABLE public.sala_caracteristicas (
  sala_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  caracteristicas_id bigint NOT NULL,
  CONSTRAINT sala_caracteristicas_pkey PRIMARY KEY (sala_id, caracteristicas_id),
  CONSTRAINT sala_caracteristicas_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.salas(id),
  CONSTRAINT sala_caracteristicas_caracteristicas_id_fkey FOREIGN KEY (caracteristicas_id) REFERENCES public.caracteristicas(id)
);
CREATE TABLE public.notebooks (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  modelo character varying,
  status_defeito boolean,
  defeito character varying,
  disponibilidade boolean,
  CONSTRAINT notebooks_pkey PRIMARY KEY (id)
);
CREATE TABLE public.carrinhos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome character varying,
  disponibilidade boolean,
  CONSTRAINT carrinhos_pkey PRIMARY KEY (id)
);
-- Legado: sala_id virou opcional, e status/datas ganharam NOT NULL e CHECK
-- nas migrations. As FKs também passaram a usar ON DELETE RESTRICT.
CREATE TABLE public.reservas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  usuario_id bigint NOT NULL,
  sala_id bigint NOT NULL,
  notebooks_id bigint,
  carrinho_id bigint,
  data_inicio timestamp with time zone,
  data_fim timestamp with time zone,
  status character varying,
  CONSTRAINT reservas_pkey PRIMARY KEY (id),
  CONSTRAINT reservas_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id),
  CONSTRAINT reservas_sala_id_fkey FOREIGN KEY (sala_id) REFERENCES public.salas(id),
  CONSTRAINT reservas_notebooks_id_fkey FOREIGN KEY (notebooks_id) REFERENCES public.notebooks(id),
  CONSTRAINT reservas_carrinho_id_fkey FOREIGN KEY (carrinho_id) REFERENCES public.carrinhos(id)
);