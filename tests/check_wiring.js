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

  const links = [...txt.matchAll(/href=["'][^"']*\/css\/([^"']+)["']/g)].map(m => m[1]);

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

// 6) As variaveis de CSS.
//
// Um var(--x) sem definicao NAO da erro nenhum. A propriedade cai em
// "invalid at computed-value time" e o navegador pinta o elemento como
// se a declaracao nao existisse — sem aviso no console. Foi assim que as
// quatro telas de acesso (login, cadastro, redefinir e recuperar senha)
// ficaram sem cor nenhuma depois do commit 997a200, que apagou
// static/css/base/variables.css: o arquivo nao era linked por ninguem,
// mas o :root dele era a unica definicao da paleta --cor-*. A tela abria,
// o formulario funcionava, so que sem fundo, sem botao e com o texto
// branco sobre o branco do navegador.
//
// A checagem e global, e nao tela por tela, de proposito: :root vale para
// o documento inteiro, entao um :root em auth.css define a variavel para
// qualquer tela que carregue aquele arquivo.
//
// var(--x, valor) com valor padrao nao e problema: e o proprio jeito de
// usar a variavel sem depender dela. Por isso --primary-color, --card-bg e
// --text-secondary, que nao tem :root nenhum em lugar nenhum, passam
// direto: se um dia a variavel deixar de existir, ninguem perde a cor.
console.log('\nVariaveis de CSS:');

// Comentario e texto igual para o resto do arquivo. Sem isso, o
// --cor-principal: que aparece escrito na explicacao do auth.css seria
// lido como definicao, e a guarda passaria sem conferir nada.
const semComentario = (txt) => txt.replace(/\/\*[\s\S]*?\*\//g, '');

const definidas = new Set();
const usadas = new Map(); // nome -> Set de arquivos

const anotarUso = (nome, origem) => {
  if (!usadas.has(nome)) usadas.set(nome, new Set());
  usadas.get(nome).add(origem);
};

// So interessa o uso SEM valor padrao: e esse que quebra a tela quando a
// variavel some. O grupo de captura final diz se o que vem depois do
// nome e uma virgula (tem fallback) ou o fecha da chamada (nao tem).
const USO = /var\(\s*(--[a-zA-Z0-9_-]+)\s*([,)])/g;
const DEFINICAO = /(--[a-zA-Z0-9_-]+)\s*:/g;

for (const rel of cssEmDisco) {
  const txt = semComentario(fs.readFileSync(path.join('static', 'css', rel), 'utf8'));
  for (const m of txt.matchAll(DEFINICAO)) definidas.add(m[1]);
  for (const m of txt.matchAll(USO)) {
    if (m[2] === ')') anotarUso(m[1], rel);
  }
}

// Estilo dentro do proprio HTML. Os templates nao tem mais nenhum — o
// commit 83e73f0 tirou — mas a guarda nao deve depender disso para
// continuar olhando o que importa.
for (const arq of varrerHtml('templates')) {
  const rel = path.relative('templates', arq).replace(/\\/g, '/');
  const bruto = fs.readFileSync(arq, 'utf8').replace(/\{#[\s\S]*?#\}/g, '');

  for (const bloco of bruto.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    const txt = semComentario(bloco[1]);
    for (const m of txt.matchAll(USO)) {
      if (m[2] === ')') anotarUso(m[1], rel);
    }
  }
}

const semDefinicao = [...usadas.keys()].filter(v => !definidas.has(v)).sort();

for (const v of [...definidas].sort()) {
  const onde = usadas.get(v);
  console.log(`  ok    ${v}${onde ? '' : '  (definida, sem uso)'}`);
}

if (semDefinicao.length) {
  console.log('  USADA SEM DEFINICAO — a propriedade cai no navegador:');
  for (const v of semDefinicao) {
    console.log(`    ${v}  <-  ${[...usadas.get(v)].join(', ')}`);
  }
}

console.log(`  -> ${definidas.size} definida(s), ${semDefinicao.length} usada(s) sem definicao`);

if (alvosQuebrados.length) process.exit(1);

if (problemas || quebradas.length || semArquivo.length) process.exit(1);

if (linksQuebrados.length || cssSemDono.length || telasSemEstilo.length) process.exit(1);

if (semDefinicao.length) process.exit(1);
