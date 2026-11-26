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

// Os CSS podem estar em subpasta. Devolve o caminho relativo a
// static/css, que e como o <link> escreve: href="/css/base/header.css".
const varrerCss = (d, prefix) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const nome = prefix ? prefix + '/' + e.name : e.name;

  if (e.isDirectory()) return varrerCss(path.join(d, e.name), nome);

  return e.name.endsWith('.css') ? [nome] : [];
});

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

// As chamadas com id são template literals (`/usuarios/${id}`) ou
// concatenação ("/usuarios/" + id). Capturar só o primeiro segmento
// gerava os falsos positivos "/usuarios/" e "/senha": as rotas reais
// existem, mas têm parâmetros. Aqui o caminho inteiro é capturado e
// normalizado antes da comparação.
const normalizar = (u) => u
  .replace(/[?#].*$/, '')          // query string e âncora não são caminho
  .replace(/\$\{[^}]*\}/g, '{}')    // ${id} do JavaScript
  .replace(/\{[^}]*\}/g, '{}')      // {usuario_id} do FastAPI
  .replace(/\/+$/, '')             // barra final não muda a rota
  || '/';

for (const arq of varrer('static/js')) {
  const src = fs.readFileSync(arq,'utf8');
  const re = /[`'"](\/[a-zA-Z_][a-zA-Z_0-9\-]*(?:\/(?:[a-zA-Z_][a-zA-Z_0-9\-]*|\$\{[^}]*\}))*(?:\?[^`'"]*)?)[`'"]/g;
  for (const m of src.matchAll(re)) chamadas.add(m[1]);
}
for (const arq of varrerHtml('templates')) {
  const html = fs.readFileSync(arq,'utf8');
  for (const m of html.matchAll(/(?:href|action)=["'](\/[^"'#?]*)/g)) chamadas.add(m[1]);
  for (const m of html.matchAll(/fetch\(\s*[`'"](\/[^`'"]*)/g)) chamadas.add(m[1]);
}

const estaticos = /^\/(css|js|assets|templates|static)/;

// Uma rota do FastAPI com {id} vira um segmento curinga. A chamada já
// normalizou os placeholders, então basta comparar os pedaços.
const comoRegex = (u) => new RegExp('^' + u.split('/').map(s =>
  s === '{}' ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
).join('/') + '$');

const rotasRegex = [...rotas].map(r => ({ original: r, re: comoRegex(normalizar(r)) }));

const quebradas = [...chamadas].filter(u => {
  if (estaticos.test(u)) return false;
  const caminho = normalizar(u);
  if (rotasRegex.some(r => r.re.test(caminho))) return false;

  // "/usuarios/" termina em barra porque o id é concatenado depois.
  // Nesse caso basta que exista uma rota que comece por ele.
  if (u.endsWith('/') && rotasRegex.some(r => r.original.startsWith(caminho + '/'))) return false;

  return true;
});
console.log('\nrotas chamadas pelo front que NAO existem no app.py: ' + (quebradas.length ? quebradas.join(', ') : 'nenhuma'));

// 3) Todo template citado no app.py precisa existir na pasta. Quando as
// telas foram movidas para professor/, auth/ e admin/, as rotas
// continuaram com o nome antigo e respondiam 500.
console.log('\nTemplates citados no app.py:');

const RAIZ_TEMPLATES = path.join(__dirname, '..', 'templates');

// "fonte" e nao "app": ja existe uma variavel com esse nome acima,
// usada para ler o proprio app.py na parte das rotas.
const fonte = fs.readFileSync(path.join(__dirname, '..', 'app.py'), 'utf8');

// As páginas são renderizadas por renderizar(request, "arquivo.html").
// O nome antigo era pagina("arquivo.html"); mantido aqui para não perder
// chamada que tenha ficado em algum arquivo.
const citados = new Set([
  ...fonte.matchAll(/renderizar\(\s*request\s*,\s*["']([^"']+\.html)["']/g),
  ...fonte.matchAll(/pagina\(\s*["']([^"']+\.html)["']/g),
].map(m => m[1]));

// As páginas em lote vêm de tuplas: `"/home": (\n "professor/x.html", ...)`.
// O padrão antigo procurava `:\s*"` e não encontrava nada, porque entre os
// dois há um `(`; por isso o teste reportava "0/0 templates".
// O fechamento `\n}` pega o fim do dicionário sem parar no contexto extra
// (um dict dentro da tupla em PAGINAS_DO_COORDENADOR).
for (const bloco of fonte.matchAll(/PAGINAS_DO_(?:PROFESSOR|COORDENADOR)\s*=\s*\{([\s\S]*?)\n\}/g)) {
  for (const m of bloco[1].matchAll(/:\s*\(\s*\n?\s*["']([^"']+\.html)["']/g)) {
    citados.add(m[1]);
  }
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

// 5) O estilo de cada tela.
//
// Um <link> para um CSS que nao existe nao da erro nenhum: o
// navegador so ignora. A tela abre sem nenhuma regra e parece um
// problema de layout. Foi o que aconteceu com 7 telas quando os
// templates foram renomeados (reservar-sala.html) e os arquivos de
// CSS ficaram com o nome antigo (escolherreservaprof.css).
//
// Aqui a tela e conferida contra os dois lados: todo link aponta para
// um arquivo que existe, e todo CSS em disco tem pelo menos uma tela
// que o usa.
console.log('\nEstilo das telas:');

// A lista de CSS em disco precisa descer nas subpastas. Uma versao
// anterior lia so a raiz, e oito arquivos parados em
// static/css/base/ e static/css/components/ — de uma tentativa
// antiga de separar o CSS — passaram sem ninguem reclamar.
const cssEmDisco = varrerCss(path.join('static', 'css'));

const cssUsados = new Set();
const linksQuebrados = [];
const telasSemEstilo = [];

// base.html, base_auth.html e os componentes nao tem estilo proprio:
// eles nao sao telas, sao o esqueleto que as telas estendem.
const NAO_E_TELA = new Set([
  'base.html',
  'auth/base_auth.html',
  'components/_header.html',
  'components/_sidebar.html',
]);

for (const arq of varrerHtml('templates')) {
  const rel = path.relative('templates', arq).replace(/\\/g, '/');
  const bruto = fs.readFileSync(arq, 'utf8');

  // Comentario Jinja e documentacao, com exemplo de link que nao
  // existe de proposito. Ler como se fosse link real daria falso
  // positivo.
  const txt = bruto.replace(/\{#[\s\S]*?#\}/g, '');

  // O sufixo "?v=..." e cache-busting: nao faz parte do nome do
  // arquivo e precisa sair antes de comparar com o que existe em disco.
  const links = [...txt.matchAll(/href=["'][^"']*\/css\/([^"'"?#]+)(?:[?#][^"']*)?["']/g)].map(m => m[1]);

  const ruins = [];
  for (const css of links) {
    cssUsados.add(css);
    if (!cssEmDisco.includes(css)) ruins.push(css);
  }
  if (links.length) {
    console.log(`  ${ruins.length ? 'QUEBRADO' : 'ok      '} ${rel}: ${[...new Set(links)].join(', ')}`);
  }

  if (ruins.length) linksQuebrados.push(`${rel} -> ${ruins.join(', ')}`);

  // A tela precisa de estilo de algum lugar: link proprio, CSS
  // dentro do proprio HTML, ou o esqueleto que ela estende.
  const temLink = links.some(c => cssEmDisco.includes(c));
  const temInline = /<style[\s>]/.test(txt);
  const herdaBase = /{%\s*extends\s+["']base(_auth)?\.html["']/.test(txt);

  if (!temLink && !temInline && !herdaBase && !NAO_E_TELA.has(rel)) {
    telasSemEstilo.push(rel);
  }
}

const cssSemDono = cssEmDisco.filter(c => !cssUsados.has(c));

if (telasSemEstilo.length) {
  console.log('  telas sem nenhum estilo:');
  for (const t of telasSemEstilo) console.log(`    ${t}`);
}

if (cssSemDono.length) {
  console.log('  CSS em disco que nenhuma tela usa:');
  for (const c of cssSemDono) console.log(`    ${c}`);
}

console.log(`  -> ${cssEmDisco.length - cssSemDono.length}/${cssEmDisco.length} CSS em uso, ` +
            `${linksQuebrados.length} link(s) quebrado(s), ${telasSemEstilo.length} tela(s) sem estilo`);

if (alvosQuebrados.length) process.exit(1);

if (problemas || quebradas.length || semArquivo.length) process.exit(1);

if (linksQuebrados.length || cssSemDono.length || telasSemEstilo.length) process.exit(1);
