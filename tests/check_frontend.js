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

console.log('\n[5] Landing pública — conteúdo verídico e contrato de UI');
{
  const landing = ler('templates/landing.html');
  const cssLanding = ler('static/css/landing.css');
  const jsLanding = ler('static/js/landing.js');

  // A landing foi reescrita; v=3 força o navegador a buscar as
  // versões novas de CSS e JS em vez de usar o cache antigo.
  check('landing usa CSS e JS v=3',
        /\/css\/landing\.css\?v=3/.test(landing) &&
        /\/js\/landing\.js\?v=3/.test(landing));

  // Prévia de tela: tem que estar identificada como ilustração e
  // não pode simular um domínio público que não existe.
  check('prévia marcada como ilustração', /Ilustração · dados fictícios/.test(landing));
  check('URL da prévia é local',
        /localhost:8000\/home/.test(landing) && !/reserva\.senai\.br/.test(landing));

  // Classes removidas na reescrita: contadores falsos, cards
  // flutuantes e abas que não existiam no sistema real.
  const classesMortas = [
    'hero-stats', 'hero-bullets', 'float-card', 'btn-mini',
    'field-grid', 'demo-enter', 'notice-demo-date', 'panel-tab'
  ];
  const classesAindaUsadas = classesMortas.filter((c) =>
    new RegExp('class="[^"]*\\b' + c + '\\b').test(landing));
  check('sem elementos decorativos removidos', classesAindaUsadas.length === 0,
        classesAindaUsadas.join(', '));

  // Afirmações que contradizem o sistema: edição de reserva não
  // existe, decisão passa por confirmação e não há "somente leitura".
  check('FAQ esclarece que não há edição',
        !/\bEditar reserva\b/i.test(landing) && /Não há edição de reserva/.test(landing));
  check('sem aprovação "em um clique"', !/em um clique/i.test(landing));
  check('sem estado "somente leitura"', !/somente leitura/i.test(landing));
  check('sem preferências que não persistem',
        !/preferências de notificação/i.test(landing));
  check('sem CTA de senha duplicado',
        !/href="\/redefinir_senha"/.test(landing) && !/href="[^"]*esqueci/i.test(landing));
  check('sem detalhe técnico de hash no FAQ', !/<strong>hash<\/strong>/i.test(landing));
  check('fila de aprovação com duas pendências',
        /badge badge-yellow">2 pendentes/.test(landing) && !/3 pendentes/.test(landing));

  // O calendário de exemplo não pode parecer dado real.
  check('calendário avisa que é exemplo',
        /Exemplo ilustrativo — não são reservas reais/.test(landing) &&
        /Dados de exemplo/.test(landing));
  check('escopo real das reservas está descrito',
        /coordenação vê todas/i.test(landing) &&
        /próprias reservas/i.test(landing));

  // Uma única região viva evita que leitores de tela anunciem a
  // lista inteira duas vezes a cada seleção de dia.
  const regioesVivas = (landing.match(/aria-live=/g) || []).length;
  check('uma única região aria-live', regioesVivas === 1, String(regioesVivas));
  check('aria-live só no subtítulo do dia',
        /id="demoDaySubtitle"[^>]*aria-live="polite"/.test(landing));

  // CSS: classes novas precisam existir e as mortas precisam sair,
  // senão a folha continua grande e com regras que nunca aplicam.
  const classesNovasCss = ['.mock-badge', '.demo-aviso', '.demo-tag',
                           '.panel-label', '.panel-estado', '.panel-content'];
  const faltandoCss = classesNovasCss.filter((c) => !cssLanding.includes(c));
  check('CSS cobre as classes novas', faltandoCss.length === 0, faltandoCss.join(', '));

  const seletoresMortosCss = ['.hero-stats', '.hero-bullets', '.float-card',
                              '.btn-mini', '.field-grid', '.demo-enter',
                              '.notice-demo-date'];
  const seletoresAindaNoCss = seletoresMortosCss.filter((c) => cssLanding.includes(c));
  check('CSS sem seletores mortos', seletoresAindaNoCss.length === 0,
        seletoresAindaNoCss.join(', '));

  // JS e CSS têm que concordar no breakpoint do menu mobile.
  check('menu usa o mesmo limite do CSS',
        /@media \(max-width: 1024px\)/.test(cssLanding) &&
        /LIMITE_MOBILE = 1024/.test(jsLanding));

  // Calendário acessível: aria-current no dia selecionado, setas
  // para navegar e rótulo com dia da semana e quantidade.
  check('calendário não usa aria-pressed',
        !/botao\.setAttribute\(['"]aria-pressed/.test(jsLanding));
  check('dia selecionado usa aria-current',
        /setAttribute\(['"]aria-current['"],\s*['"]date/.test(jsLanding));
  check('matriz do calendário é variável',
        !/i < 42/.test(jsLanding) &&
        /Math\.ceil\(\(primeiro\.getDay\(\) \+ diasNoMes/.test(jsLanding));
  check('rótulo do dia traz semana e quantidade',
        /DIAS_SEMANA\[dataLocal/.test(jsLanding) && / reservas?/.test(jsLanding));
  check('setas e Home/End navegam pelo calendário',
        /ArrowLeft/.test(jsLanding) && /ArrowRight/.test(jsLanding) &&
        /'Home'/.test(jsLanding) && /'End'/.test(jsLanding));

  // O painel real não mostra professor; o menu devolve o foco ao
  // destino da âncora e o botão de tema mantém nome estável.
  check('exemplos do calendário sem professor',
        !/professor:/.test(jsLanding) && !/Prof\. /.test(jsLanding));
  check('menu devolve foco ao destino da âncora', /focarDestino\(/.test(jsLanding));
  check('menu fecha ao rolar',
        /menuAberto\(\) && window\.scrollY > 8/.test(jsLanding));
  check('botão de tema mantém nome acessível estável',
        !/botaoTema\.setAttribute\(['"]aria-label/.test(jsLanding));
}

console.log(`\n${ok} passaram, ${falhas} falharam`);
process.exit(falhas === 0 ? 0 : 1);
