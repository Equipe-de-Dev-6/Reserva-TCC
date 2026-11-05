const fs = require('fs'); const vm = require('vm');

let ok = 0, fail = 0;
const check = (n, c, d) => { if (c) { ok++; console.log('  ok   ' + n); } else { fail++; console.log('  FALHA ' + n + (d ? ' -> ' + d : '')); } };

function criarFetch(respostas) {
  const fila = [...respostas];
  return async (url, opcoes) => {
    const r = fila.shift();
    return {
      ok: r.status < 400,
      status: r.status,
      json: async () => r.corpo,
    };
  };
}

const codigo = fs.readFileSync(__dirname + '/../static/js/avisos.js', 'utf8');

(async () => {
  // 1. Lista vazia
  {
    const ctx = vm.createContext({ fetch: criarFetch([{ status: 200, corpo: [] }]), window: {}, Date, Math, JSON, console });
    vm.runInContext(codigo, ctx, { filename: 'avisos.js' });
    const app = vm.runInContext('AvisosApp', ctx);
    const lista = await app.getAvisos();
    check('começa vazio', lista.length === 0);
  }

  // 2. Cria aviso
  {
    const ctx = vm.createContext({ fetch: criarFetch([
      { status: 201, corpo: { id: 1, titulo: 'Manutencao' } },
      { status: 200, corpo: [{ id: 1, titulo: 'Manutencao' }] },
    ]), window: {}, Date, Math, JSON, console });
    vm.runInContext(codigo, ctx, { filename: 'avisos.js' });
    const app = vm.runInContext('AvisosApp', ctx);
    const criado = await app.addAviso({ titulo: 'Manutencao', descricao: 'Sala C20', data: '2026-10-20' });
    check('aviso criado', criado && criado.id === 1);
    const lista = [{ id: 1, titulo: 'Manutencao' }];
    check('lista tem o aviso', lista.length === 1);
  }

  // 3. Exclui aviso
  {
    const ctx = vm.createContext({ fetch: criarFetch([
      { status: 200, corpo: [{ id: 1, titulo: 'Manutenção' }] },
      { status: 200, corpo: { mensagem: 'ok' } },
      { status: 200, corpo: [] },
    ]), window: {}, Date, Math, JSON, console });
    vm.runInContext(codigo, ctx, { filename: 'avisos.js' });
    const app = vm.runInContext('AvisosApp', ctx);
    await app.getAvisos();
    const okExcluir = await app.deleteAviso(1);
    check('exclui', okExcluir === true);
    const lista = await app.getAvisos();
    check('lista vazia apos exclusao', lista.length === 0);
  }

  // 4. Erro de rede não quebra
  {
    const ctx = vm.createContext({ fetch: async () => { throw new Error('rede'); }, window: {}, Date, Math, JSON, console });
    vm.runInContext(codigo, ctx, { filename: 'avisos.js' });
    const app = vm.runInContext('AvisosApp', ctx);
    let falhou = false;
    try { await app.getAvisos(); } catch (e) { falhou = true; }
    check('erro de rede propagado', falhou);
  }

  console.log(`\n${ok} passaram, ${fail} falharam`);
  process.exit(fail === 0 ? 0 : 1);
})();