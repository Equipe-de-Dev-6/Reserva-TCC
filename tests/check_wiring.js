const fs = require('fs');
const path = require('path');

// As telas estao em subpastas (professor/, auth/, admin/, errors/), e
// readdirSync devolve tambem os diretorios: ler um deles como se fosse
// arquivo da erro. Por isso estas duas funcoes descem a arvore, e
// ficam aqui em cima porque "const" nao sobe antes do primeiro uso.
const varrer = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory()
    ? varrer(path.join(d, e.name))
    : (e.name.endsWith('.js') ? [path.join(d, e.name)] : []));

const varrerHtml = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory()
    ? varrerHtml(path.join(d, e.name))
    : (e.name.endsWith('.html') ? [path.join(d, e.name)] : []));

const texto = fs.readFileSync(__dirname + '/../static/js/api.js', 'utf8');
const nomes = [...texto.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map(m => m[1]);
const tab = new Set(nomes);
console.log('api.js exporta ' + tab.size + ' funcoes');

// 1) Todo import de api.js existe?
let problemas = 0;
for (const arq of varrerHtml('templates')) {
  const html = fs.readFileSync(arq, 'utf8');
  const m = html.match(/import\s*\{([^}]*)\}\s*from\s*['"]\/js\/api\.js['"]/);
  if (!m) continue;
  const pedidos = m[1].split(',').map(s => s.trim()).filter(Boolean);
  const faltando = pedidos.filter(n => !tab.has(n));
  console.log(`  ${arq}: pede ${pedidos.length} -> ${faltando.length ? 'FALTAM ' + faltando.join(', ') : 'tudo existe'}`);
  if (faltando.length) problemas++;
}
for (const arq of ['static/js/cadastro.js','static/js/salas.js']) {
  const src = fs.readFileSync(arq,'utf8');
  const m = src.match(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*api\.js['"]/);
  if (!m) continue;
  const pedidos = m[1].split(',').map(s => s.trim()).filter(Boolean);
  const faltando = pedidos.filter(n => !tab.has(n));
  console.log(`  ${arq}: pede ${pedidos.join(', ')} -> ${faltando.length ? 'FALTAM ' + faltando.join(', ') : 'tudo existe'}`);
  if (faltando.length) problemas++;
}

// 2) Rotas chamadas pelas telas que existem no app.py?
const app = fs.readFileSync('app.py','utf8');
const rotas = new Set([...app.matchAll(/@app\.(?:get|post|put|delete|patch)\(\s*["']([^"']+)["']/g)].map(m => m[1]));
// As rotas criadas em lote vivem num dicionario. O valor pode ser uma
// string ("\"x\": \"arquivo.html\"") ou uma tupla com dois campos
// ("\"x\": (\n \"admin/x.html\", \n \"buscar...\")"), conforme a tela
// ja foi convertida para o Jinja2. O padrao aceita as duas formas.
const criados = [...app.matchAll(/"(\/[a-z_0-9\-]+)":\s*\(?\s*"([^"]+)"/g)].map(m => m[1]);
criados.forEach(r => rotas.add(r));
const chamadas = new Set();
for (const arq of varrer('static/js')) {
  const src = fs.readFileSync(arq,'utf8');
  for (const m of src.matchAll(/[`'"](\/(?:[a-z_][a-z_0-9\-]*))(?:\/\$\{[^}]*\})?[`'"]/g)) chamadas.add(m[1]);
}
for (const arq of varrerHtml('templates')) {
  const html = fs.readFileSync(arq,'utf8');
  for (const m of html.matchAll(/(?:href|action)=["'](\/[a-zA-Z_][a-zA-Z_0-9\-]*)/g)) chamadas.add(m[1]);
  for (const m of html.matchAll(/fetch\(\s*[`'"]([^`'"]+)/g)) { const u = m[1].replace(/\$\{[^}]*\}.*/, ''); if (u.startsWith('/')) chamadas.add(u); }
}
const estaticos = /^\/(css|js|assets|templates|static)/;
const quebradas = [...chamadas].filter(u => !estaticos.test(u) && !rotas.has(u));
console.log('\nrotas chamadas pelo front que NAO existem no app.py: ' + (quebradas.length ? quebradas.join(', ') : 'nenhuma'));

// 3) Todo template citado no app.py precisa existir na pasta. Quando as
// telas foram movidas para professor/, auth/ e admin/, as rotas
// continuaram com o nome antigo e respondiam 500.
console.log('\nTemplates citados no app.py:');

const RAIZ_TEMPLATES = path.join(__dirname, '..', 'templates');

// "fonte" e nao "app": ja existe uma variavel com esse nome acima,
// usada para ler o proprio app.py na parte das rotas.
const fonte = fs.readFileSync(path.join(__dirname, '..', 'app.py'), 'utf8');

const citados = new Set([...fonte.matchAll(/pagina\(\s*"([^"]+)"/g)].map(m => m[1]));
for (const bloco of fonte.matchAll(/PAGINAS_DO_(?:PROFESSOR|COORDENADOR)\s*=\s*\{([\s\S]*?)\}/g)) {
  for (const m of bloco[1].matchAll(/:\s*"([^"]+)"/g)) citados.add(m[1]);
}

const semArquivo = [];
for (const nome of [...citados].sort()) {
  const existe = fs.existsSync(path.join(RAIZ_TEMPLATES, nome));
  if (!existe) semArquivo.push(nome);
  console.log(`  ${existe ? 'ok    ' : 'FALTA '} ${nome}`);
}
console.log(`  -> ${citados.size - semArquivo.length}/${citados.size} templates encontrados`);


// 4) A arvore do Jinja2: todo {% extends %} e {% include %} tem que
// apontar para um arquivo que existe.
console.log('\nTemplates Jinja2 (extends/include):');

const varrerJinja = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory()
    ? varrerJinja(path.join(d, e.name))
    : (e.name.endsWith('.html') ? [path.join(d, e.name)] : []));

let herdam = 0;
const alvosQuebrados = [];

for (const arq of varrerJinja('templates')) {
  const txt = fs.readFileSync(arq, 'utf8');

  if (!/{%\s*extends\s+/.test(txt)) continue;
  herdam++;

  const referencias = [
    ...txt.matchAll(/{%\s*extends\s+["']([^"']+)["']/g),
    ...txt.matchAll(/{%\s*include\s+["']([^"']+)["']/g),
  ];

  const ruins = [];
  for (const m of referencias) {
    if (!fs.existsSync(path.join('templates', m[1]))) ruins.push(m[1]);
  }

  console.log(`  ${ruins.length ? 'FALTA' : 'ok   '} ${arq}`);
  if (ruins.length) {
    alvosQuebrados.push(`${arq} -> ${ruins.join(', ')}`);
  }
}

console.log(`  -> ${herdam} telas herdam de base.html`);

if (alvosQuebrados.length) {
  console.log('  alvos que nao existem:');
  for (const a of alvosQuebrados) console.log(`    ${a}`);
}

// Um include de componente que nao existe quebra a tela na hora de
// renderizar, e o sintoma e um 500 sem dizer o motivo.
const componentes = fs.readdirSync(path.join('templates', 'components'));
console.log(`\nComponentes: ${componentes.join(', ')}`);

if (alvosQuebrados.length) process.exit(1);

if (problemas || quebradas.length || semArquivo.length) process.exit(1);
