// Verificações de consistência do front que os testes de lógica não
// cobrem: manifest PWA, service worker, duplicação de listeners e o
// contrato entre telas e a API.
//
// São checagens estáticas: leem os arquivos como texto e não precisam
// de navegador. Rodam junto com as outras suítes em `python tests/run.py`.

const fs = require('fs');
const path = require('path');

let ok = 0;
let falhas = 0;

function check(nome, condicao, detalhe) {
  if (condicao) {
    ok++;
    console.log('  ok   ' + nome);
  } else {
    falhas++;
    console.log('  FALHA ' + nome + (detalhe ? ' -> ' + detalhe : ''));
  }
}

const ler = (arquivo) =>
  fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8');

const varrer = (diretorio) =>
  fs.readdirSync(path.join(__dirname, '..', diretorio), { withFileTypes: true })
    .flatMap((entrada) =>
      entrada.isDirectory()
        ? varrer(path.join(diretorio, entrada.name))
        : [path.join(diretorio, entrada.name)]);

console.log('[1] manifest.json');
{
  const bruto = ler('static/manifest.json');
  let manifesto;

  try {
    manifesto = JSON.parse(bruto);
    check('JSON válido', true);
  } catch (erro) {
    check('JSON válido', false, erro.message);
    manifesto = {};
  }

  // JSON.parse aceita chaves repetidas e fica com a última. Procurar no
  // texto evita que uma chave duplicada passe batido, como acontecia
  // com orientation/theme_color neste arquivo.
  // Só as chaves de primeiro nível (2 espaços): dentro de "icons" a
  // chave "src" se repete de propósito e não é duplicata inválida.
  const chaves = [...bruto.matchAll(/^  "([A-Za-z_]+)"\s*:/gm)].map((m) => m[1]);
  const repetidas = chaves.filter((c, i) => chaves.indexOf(c) !== i);
  check('sem chaves duplicadas', repetidas.length === 0, repetidas.join(', '));

  const permitidas = new Set([
    'name', 'short_name', 'description', 'lang', 'dir', 'start_url',
    'scope', 'display', 'display_override', 'orientation',
    'background_color', 'theme_color', 'id', 'categories', 'icons',
    'screenshots', 'shortcuts', 'prefer_related_applications',
    'related_applications',
  ]);
  const desconhecidas = chaves.filter((c) => !permitidas.has(c));
  check('só chaves padrão', desconhecidas.length === 0, desconhecidas.join(', '));
  check('uma única orientation', String(manifesto.orientation) === 'portrait-primary',
        String(manifesto.orientation));
  check('ícones completos', Array.isArray(manifesto.icons) &&
        manifesto.icons.length > 0 &&
        manifesto.icons.every((i) => i.src && i.sizes && i.type === 'image/png'));
}

console.log('\n[2] Service worker');
{
  const sw = ler('static/sw.js');

  // Service worker não tem window nem navigator. O código antigo usava
  // os dois e quebrava antes de registrar notificationclick. Comentários
  // citam esses nomes para explicar o motivo, então são removidos antes
  // da checagem.
  const codigo = sw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  check('não usa window', !/\bwindow\s*[.[]/.test(codigo));
  check('não usa navigator', !/\bnavigator\s*[.[]/.test(codigo));
  check('registra notificationclick', /addEventListener\(['"]notificationclick['"]/.test(sw));
  check('remove notification.onclick', !/notification\.onclick/.test(sw));
  check('ativa imediatamente', /skipWaiting\(\)/.test(sw) && /clients\.claim\(\)/.test(sw));
  check('abre ou foca uma janela', /openWindow|navigate\(/.test(sw));
}

console.log('\n[3] Menus sem listeners duplicados');
{
  const arquivos = varrer('templates').filter((a) => a.endsWith('.html'));
  const duplicados = [];

  for (const arquivo of arquivos) {
    const html = fs.readFileSync(path.join(__dirname, '..', arquivo), 'utf8');
    const ocorrencias = (html.match(/menuToggle\.addEventListener/g) || []).length;
    if (ocorrencias) duplicados.push(`${arquivo} (${ocorrencias})`);
  }

  check('app.js é a única fonte do menu mobile', duplicados.length === 0,
        duplicados.join(', '));
}

console.log('\n[4] Fluxos corrigidos');
{
  const api = ler('static/js/api.js');
  const wrappers = [
    'atualizarMe', 'listarPendencias', 'aceitarPendencia',
    'recusarPendencia', 'listarNotificacoes', 'criarNotificacao',
    'marcarNotificacaoLida', 'excluirNotificacao',
  ];
  const faltando = wrappers.filter((w) =>
    !new RegExp(`export\\s+async\\s+function\\s+${w}\\b`).test(api));
  check('wrappers da API existem', faltando.length === 0, faltando.join(', '));

  const configuracoes = ler('static/js/pages/configuracoes.js');
  check('configurações usam /usuarios/me', /atualizarMe\(/.test(configuracoes));
  check('configurações não enviam cargo', !/dados\.cargo/.test(configuracoes));
  check('campo cargo é somente leitura',
        /id="cargo"[\s\S]{0,80}disabled/.test(ler('templates/configuracoes.html')));

  const redef = ler('templates/auth/redefsenha.html');
  check('tela de senha carrega o módulo de envio',
        /esqueceu_senha\.js/.test(redef));
  check('tela de senha pede email e confirmação',
        /id="email"/.test(redef) && /id="senha"/.test(redef) &&
        /id="confirmar-senha"/.test(redef));

  const gabinetes = ler('static/js/pages/escolherreservaprof3.js');
  check('gabinete não registra clique duplicado',
        !/addEventListener\(\s*['"]click/.test(gabinetes) &&
        !/location\.href/.test(gabinetes));

  const notificacoes = ler('static/js/pages/notificacoesprof.js');
  check('notificações vêm da API', /listarNotificacoes\(/.test(notificacoes));
  check('notificações não usam só o cache local',
        !/ReservasApp\.getNotificacoes\(/.test(notificacoes));

  check('home do coordenador aponta para /reservar_admin',
        /href="\/reservar_admin"/.test(ler('templates/admin/home.html')));

  const confirmacao = ler(
    'templates/professor/reservar/salas/reservar-sala-confirmacao.html');
  check('confirmação escolhe destino por perfil',
        /\{\{\s*rota_reservas\s*\}\}/.test(confirmacao) &&
        /\{\{\s*rota_inicio\s*\}\}/.test(confirmacao));
  check('confirmação não fixa link de professor',
        !/href="\/reservas_prof"/.test(confirmacao) &&
        !/href="\/home"/.test(confirmacao));
}

console.log(`\n${ok} passaram, ${falhas} falharam`);
process.exit(falhas === 0 ? 0 : 1);
