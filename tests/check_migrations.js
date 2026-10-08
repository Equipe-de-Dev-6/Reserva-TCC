// Confere que as migrations podem ser rodadas mais de uma vez.
//
// Um erro que já aconteceu duas vezes: um comando que derruba um
// objeto com um nome e cria outro com nome diferente. Na primeira
// execução funciona; na segunda, o DROP não encontra o objeto do DROP
// anterior e o CREATE falha com "already exists" — ou, o que é pior,
// deixa o nome antigo no banco enquanto o código espera o novo.
//
//     node tests/check_migrations.js
//
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ARQUIVOS = [
  'migracao_reservas.sql',
  'migracao_schema.sql',
  'migracao_rls.sql',
];

let passou = 0;
let falhou = 0;

function check(nome, condicao, detalhe) {
  if (condicao) {
    passou++;
    console.log(`  ok   ${nome}`);
  } else {
    falhou++;
    console.log(`  FALHA ${nome}` + (detalhe ? ` -> ${detalhe}` : ''));
  }
}

console.log('\n[1] Constraints: todo ADD tem o DROP do mesmo nome');

// Nomes que uma versao anterior do arquivo criou por engano e que
// precisam ser derrubados sem serem recriados. É a unica excecao
// permitida a regra do DROP orfao: o DROP existe justamente para
// limpar o nome errado que ficou no banco.
const NOMES_DE_LIMPEZA = new Set(['reservations_status_check']);

for (const arquivo of ARQUIVOS) {
  const caminho = path.join(RAIZ, arquivo);
  if (!fs.existsSync(caminho)) continue;

  const sql = fs.readFileSync(caminho, 'utf8');

  const drops = [
    ...sql.matchAll(/DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?(\w+)/gi),
  ].map((m) => m[1].toLowerCase());

  const adds = [
    ...sql.matchAll(/ADD\s+CONSTRAINT\s+(\w+)/gi),
  ].map((m) => m[1].toLowerCase());

  const semDrop = adds.filter((nome) => !drops.includes(nome));
  const dropSemAdd = drops.filter(
    (nome) => !adds.includes(nome) && !NOMES_DE_LIMPEZA.has(nome)
  );

  check(
    `${arquivo}: nenhum ADD sem DROP do mesmo nome`,
    semDrop.length === 0,
    semDrop.join(', ')
  );
  check(
    `${arquivo}: nenhum DROP órfão`,
    dropSemAdd.length === 0,
    dropSemAdd.join(', ')
  );
}

console.log('\n[2] Triggers: todo CREATE tem o DROP do mesmo nome');

for (const arquivo of ARQUIVOS) {
  const caminho = path.join(RAIZ, arquivo);
  if (!fs.existsSync(caminho)) continue;

  const sql = fs.readFileSync(caminho, 'utf8');

  const drops = [
    ...sql.matchAll(/DROP\s+TRIGGER\s+(?:IF\s+EXISTS\s+)?(\w+)/gi),
  ].map((m) => m[1].toLowerCase());

  const creates = [
    ...sql.matchAll(/CREATE\s+TRIGGER\s+(\w+)/gi),
  ].map((m) => m[1].toLowerCase());

  const semDrop = creates.filter((nome) => !drops.includes(nome));

  check(
    `${arquivo}: nenhum CREATE TRIGGER sem DROP do mesmo nome`,
    semDrop.length === 0,
    semDrop.join(', ')
  );
}

console.log('\n[3] Índices: sempre com IF NOT EXISTS');

for (const arquivo of ARQUIVOS) {
  const caminho = path.join(RAIZ, arquivo);
  if (!fs.existsSync(caminho)) continue;

  const sql = fs.readFileSync(caminho, 'utf8');

  const semProtecao = [
    ...sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS)(\w+)/gi),
  ].map((m) => m[1]);

  check(
    `${arquivo}: todo índice é "IF NOT EXISTS"`,
    semProtecao.length === 0,
    semProtecao.join(', ')
  );
}

console.log('\n[4] Tabelas: sempre com IF NOT EXISTS');

for (const arquivo of ARQUIVOS) {
  const caminho = path.join(RAIZ, arquivo);
  if (!fs.existsSync(caminho)) continue;

  const sql = fs.readFileSync(caminho, 'utf8');

  const semProtecao = [
    ...sql.matchAll(/CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)(\w+)/gi),
  ].map((m) => m[1]);

  check(
    `${arquivo}: toda tabela é "IF NOT EXISTS"`,
    semProtecao.length === 0,
    semProtecao.join(', ')
  );
}

console.log('\n[5] Colunas do ALTER TABLE existem na tabela');

const COLUNAS = {
  salas: ['id', 'nome', 'caracteristica', 'disponibilidade', 'historico', 'reservavel'],
  usuarios: ['id', 'nome', 'email', 'senha', 'cargo'],
  reservas: ['id', 'usuario_id', 'sala_id', 'notebooks_id', 'carrinho_id', 'data_inicio',
    'data_fim', 'status', 'categoria', 'item', 'professor', 'curso', 'motivo',
    'criado_em', 'atualizado_em'],
  carrinhos: ['id', 'nome', 'disponibilidade'],
  notebooks: ['id', 'modelo', 'status_defeito', 'defeito', 'disponibilidade'],
  caracteristicas: ['id', 'nome'],
  sala_caracteristicas: ['sala_id', 'caracteristicas_id'],
  login_tentativas: ['id', 'endereco', 'tentativa'],
};

for (const arquivo of ARQUIVOS) {
  const caminho = path.join(RAIZ, arquivo);
  if (!fs.existsSync(caminho)) continue;

  const sql = fs.readFileSync(caminho, 'utf8');
  const problemas = [];

  // Cada comando entre ponto e virgula é conferido contra a tabela que
  // ele altera.
  for (const bruto of sql.split(';')) {
    const cmd = bruto.trim();
    const alvo = cmd.match(/^ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?(\w+)/i);
    if (!alvo) continue;

    const tabela = alvo[1].toLowerCase();
    if (!COLUNAS[tabela]) {
      problemas.push(`tabela desconhecida: ${tabela}`);
      continue;
    }

    const conhecidos = COLUNAS[tabela];

    for (const m of cmd.matchAll(/ALTER\s+COLUMN\s+(\w+)/gi)) {
      if (!conhecidos.includes(m[1].toLowerCase())) {
        problemas.push(`${tabela}: ALTER COLUMN ${m[1]}`);
      }
    }

    for (const m of cmd.matchAll(/(?:ADD|DROP)\s+COLUMN\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(\w+)/gi)) {
      if (!conhecidos.includes(m[1].toLowerCase())) {
        problemas.push(`${tabela}: coluna ${m[1]}`);
      }
    }

    for (const m of cmd.matchAll(/^\s*(\w+)\s*=/gm)) {
      if (!conhecidos.includes(m[1].toLowerCase())) {
        problemas.push(`${tabela}: atribuição a ${m[1]}`);
      }
    }
  }

  check(
    `${arquivo}: colunas dentro da tabela certa`,
    problemas.length === 0,
    [...new Set(problemas)].join('; ')
  );
}

console.log(`\n${passou} passaram, ${falhou} falharam\n`);
process.exit(falhou === 0 ? 0 : 1);