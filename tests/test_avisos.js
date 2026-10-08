const fs = require('fs'); const vm = require('vm');
const dados = new Map();
const codigo = fs.readFileSync(__dirname + '/../static/js/avisos.js','utf8');

const storage = {
  getItem: k => dados.has(k) ? dados.get(k) : null,
  setItem: (k,v) => dados.set(k, String(v)),
  removeItem: k => dados.delete(k),
};

let ok = 0, fail = 0;
const check = (n, c, d) => { if (c) { ok++; console.log('  ok   ' + n); } else { fail++; console.log('  FALHA ' + n + (d ? ' -> ' + d : '')); } };

// Cada "carregamento de pagina" e um contexto novo, com o mesmo
// armazenamento.
function carregar() {
  const ctx = vm.createContext({ localStorage: storage, Date, Math, JSON, console });
  vm.runInContext(codigo, ctx, { filename: 'avisos.js' });
  return vm.runInContext('AvisosApp', ctx);
}

let app = carregar();
check('começa vazio', app.getAvisos().length === 0);

app.addAviso({ titulo: 'Manutenção', descricao: 'Sala C20', data: '2026-10-20' });
check('aviso criado', app.getAvisos().length === 1);
check('gravou no localStorage', dados.has('reservaSenaiAvisos'));

app = carregar();
check('sobrevive ao recarregar', app.getAvisos().length === 1, JSON.stringify(app.getAvisos()));
check('conteudo preservado', app.getAvisos()[0].titulo === 'Manutenção', app.getAvisos()[0] && app.getAvisos()[0].titulo);

const id = app.getAvisos()[0].id;
app.deleteAviso(id);
check('exclui', app.getAvisos().length === 0);

app = carregar();
check('exclusao persistida', app.getAvisos().length === 0);

// JSON corrompido.
dados.set('reservaSenaiAvisos', '{nao e json');
app = carregar();
check('JSON corrompido nao quebra', Array.isArray(app.getAvisos()) && app.getAvisos().length === 0);

// localStorage indisponivel.
const ctx2 = vm.createContext({
  localStorage: { getItem: () => { throw new Error('bloqueado'); },
                  setItem: () => { throw new Error('bloqueado'); },
                  removeItem: () => {} },
  Date, Math, JSON, console,
});
vm.runInContext(codigo, ctx2, { filename: 'avisos.js' });
const a2 = vm.runInContext('AvisosApp', ctx2);
a2.addAviso({ titulo: 'Teste', descricao: 'x', data: '' });
check('sem localStorage continua em memoria', a2.getAvisos().length === 1);

console.log(`\n${ok} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
