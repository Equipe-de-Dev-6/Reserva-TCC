const fs = require('fs');
const path = require('path');
const vm = require('vm');



const texto = fs.readFileSync(__dirname + '/../static/js/api.js','utf8');
const nomes = [...texto.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)].map(m => m[1]);
const tab = new Set(nomes);
console.log('api.js exporta ' + tab.size + ' funcoes');

// 1) Todo import de api.js existe?
let problemas = 0;
for (const arq of fs.readdirSync('templates')) {
  const html = fs.readFileSync(path.join('templates', arq), 'utf8');
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
const criados = [...app.matchAll(/"(\/[a-z_0-9\-]+)":\s*"/g)].map(m => m[1]);
criados.forEach(r => rotas.add(r));
const chamadas = new Set();
const varrer = (d) => fs.readdirSync(d,{withFileTypes:true}).flatMap(e =>
  e.isDirectory() ? varrer(path.join(d,e.name)) : (e.name.endsWith('.js') ? [path.join(d,e.name)] : []));
for (const arq of varrer('static/js')) {
  const src = fs.readFileSync(arq,'utf8');
  for (const m of src.matchAll(/[`'"](\/(?:[a-z_][a-z_0-9\-]*))(?:\/\$\{[^}]*\})?[`'"]/g)) chamadas.add(m[1]);
}
for (const arq of fs.readdirSync('templates')) {
  const html = fs.readFileSync(path.join('templates', arq),'utf8');
  for (const m of html.matchAll(/(?:href|action)=["'](\/[a-zA-Z_][a-zA-Z_0-9\-]*)/g)) chamadas.add(m[1]);
  for (const m of html.matchAll(/fetch\(\s*[`'"]([^`'"]+)/g)) { const u = m[1].replace(/\$\{[^}]*\}.*/, ''); if (u.startsWith('/')) chamadas.add(u); }
}
const estaticos = /^\/(css|js|assets|templates|static)/;
const quebradas = [...chamadas].filter(u => !estaticos.test(u) && !rotas.has(u));
console.log('\nrotas chamadas pelo front que NAO existem no app.py: ' + (quebradas.length ? quebradas.join(', ') : 'nenhuma'));
if (problemas || quebradas.length) process.exit(1);
