# Revisão técnica — Reserva SENAI

Revisão completa feita na branch ativa `main` antes da apresentação (o
checkout mudou externamente de `General-Review` para `main` durante a
revisão). O objetivo foi percorrer backend, SQL, documentação, templates e
JavaScript, comentar o que cada trecho faz, corrigir bugs e falhas de
segurança e deixar uma suíte de testes que rode sem dependências externas.

> **Importante:** nada foi enviado (`push`) para o repositório remoto. Todo o
> trabalho está nos commits locais da branch `main`.

---

## 1. Como reproduzir a verificação

Na raiz do projeto:

```powershell
python tests/run.py
```

O executor roda, em processos separados:

| Suíte | O que cobre |
| --- | --- |
| `tests/test_api.py` | Autenticação, sessão, autorização, limites, notificações, pedidos de senha e configurações |
| `tests/test_reservas.js` | Regras de reserva, rascunho, persistência local e formatação |
| `tests/test_avisos.js` | Criação/listagem/exclusão de avisos pela API |
| `tests/test_calendario.js` | Navegação de meses, link por URL e escape de HTML |
| `tests/check_wiring.js` | Nomes exportados por `api.js`, rotas chamadas pelo front, templates e CSS |
| `tests/check_frontend.js` | Manifesto PWA, service worker, menus duplicados e contratos das telas |
| `tests/check_migrations.js` | Idempotência das migrations SQL |

Verificações adicionais de sintaxe:

```powershell
Get-ChildItem -Recurse -File -Filter *.js -Path static,tests | ForEach-Object { node --check $_.FullName }
python -m compileall -q app.py model.py db.py consulta.py consulta_salas.py criptografia.py sessao.py services tests
```

### Resultado final

```
134 verificações em test_api.py        — 0 falhas
 71 verificações em test_reservas.js   — 0 falhas
  6 verificações em test_avisos.js     — 0 falhas
 14 verificações em test_calendario.js — 0 falhas
 51 verificações em check_frontend.js — 0 falhas
 36 verificações em check_migrations.js— 0 falhas
check_wiring.js: 0 rotas quebradas, 25/25 templates, 21/21 CSS, 0 links quebrados
node --check e compileall: sem erros
python tests/run.py: "tudo certo", código de saída 0
```

Nenhum teste acessa o Supabase de verdade: o cliente é substituído por um
dublê que registra as consultas, e o navegador por equivalentes em `vm`.

---

## 2. Achados corrigidos

### Backend e segurança

- **Autorização**: `PUT /usuarios/{id}` continua exclusivo do coordenador.
  Foi criado `PUT /usuarios/me` para o professor editar nome/e-mail; a
  identidade vem da sessão e o campo `cargo` é removido antes do update,
  então ninguém se promove sozinho. O cookie de sessão é atualizado junto.
- **Força bruta**: `TENTATIVAS_POR_ENDERECO` passou de 1000 para 8 por
  janela de 5 minutos. Login, `/senha/id` e `/senha/solicitar` têm
  contadores próprios, para um fluxo não bloquear o outro sem motivo.
- **Notificações**: o limite passou a ser por `(IP, usuario_id)`. Professores
  na mesma rede do campus não bloqueiam uns aos outros.
- **Fluxo de senha**: `/senha/solicitar` grava o **hash** da nova senha em
  `pendencias_senhas`; `/pendencias`, `/pendencias/{id}/aceitar` e
  `/pendencias/{id}/recusar` permitem ao coordenador decidir. A data da
  solicitação (`solicitado_em`) voltou na listagem.
- **Entrada**: validação de bytes antes do bcrypt (senha acima de 72 bytes
  vira 400), e tamanho/tipo de título e mensagem das notificações.
- **Divulgação de informação**: respostas de falha de login e de consulta de
  senha usam a mesma mensagem, sem dizer se o e-mail existe. O rate limit
  documentado é a mitigação para enumeração no fluxo público.
- **SQL**: `migracao_pendencias.sql` foi criado — a tabela
  `pendencias_senhas` era usada pelo código mas não existia em nenhum
  arquivo SQL. Todas as migrations são idempotentes (`IF NOT EXISTS`,
  `DROP ... IF EXISTS`) e o validador confirma isso.

### Frontend

- **Configurações do professor**: o formulário chamava a rota administrativa
  e sempre recebia 403. Agora usa `atualizarMe()`, e `cargo` aparece como
  campo desativado, alterado apenas pelo coordenador.
- **Tela de senha**: `/redefinir_senha` deixou de redirecionar para `/` e
  passou a enviar `email + senha + confirmar-senha`. O JSDoc de
  `solicitarAlteracaoSenha` agora diz a verdade: a API devolve `{ id }`.
- **Pedidos de senha**: novas telas `templates/admin/pendencias.html` e
  `static/js/pages/pendencias.js` listam e decidem os pedidos; o item
  “Pedidos de Senha” entrou no menu do coordenador.
- **Service worker**: `window.matchMedia` e `navigator` dentro de `sw.js`
  quebravam o arquivo antes de registrar `notificationclick`. O SW agora só
  trata `install`, `activate` e clique; o aviso de instalação e o pedido de
  permissão ficaram em `notificacoes-push.js`, que roda na página.
  `notificarAprovacao` foi habilitado e o listener `storage` (que nunca
  disparava com o estado em memória) foi removido.
- **Dupla navegação**: o listener extra de gabinete em
  `escolherreservaprof3.js` foi removido. Quem decide a seleção é
  `salas.js`, que confirma a sala na API antes de avançar.
- **Menus duplicados**: os blocos inline de dropdown/menu mobile foram
  removidos de sete templates. `app.js`, carregado pelo `base.html`, é a
  única fonte desses comportamentos.
- **Notificações**: `notificacoesprof.js` passou a ler `GET
  /api/notificacoes` e a marcar/excluir pela API, em vez do cache local de
  `reservas.js`. Novos wrappers foram adicionados a `api.js`.
- **Coordenador no fluxo certo**: home admin aponta para `/reservar_admin`;
  a tela de confirmação compartilhada escolhe `/reservas_admin` e
  `/home_admin` pelo perfil, sem mandar o coordenador para telas de professor.
- **Defesa em profundidade**: `statusInfo()` não devolve mais um status
  desconhecido cru para `innerHTML`; vira “Aguardando” com badge amarela.
  Dados do banco entram com `textContent` ou `escapeHtml`.
- **Configurações admin**: o botão salvar deixou de ser um `alert()` e agora
  chama `PUT /usuarios/{id}` com nome/e-mail/cargo.
- **PWA**: `manifest.json` teve chaves não padrão e duplicatas removidas.
- **Limpeza**: blocos vazios/obsoletos e linhas com só espaços foram
  retirados de `passo2reservaprof.js`, `passo3reservaprof.js`, `avisos.js`,
  `configuracoes.js` e `professores.html`.

### Testes

- Correções em `check_wiring.js`: rotas com parâmetros e concatenação deixaram
  de ser falsos positivos; o detector de templates passou a reconhecer
  `renderizar()` e as tuplas dos dicionários de páginas.
- `check_wiring.js` agora valida imports de `api.js` em **todos** os módulos,
  não só em uma lista fixa de dois arquivos.
- `test_avisos.js` voltou a ler a lista pela API (antes usava um array local
  e passava mesmo sem gravar nada).
- `test_calendario.js` usa escape real no dublê e tem um teste de XSS no
  painel do dia.
- `test_reservas.js` verifica também o rótulo de status desconhecido.
- Novo `check_frontend.js` cobre manifest, service worker, menus duplicados
  e os contratos corrigidos entre telas e API.

### Landing pública (segunda rodada)

A landing foi reescrita porque continha informação falsa e elementos que o
usuário não precisava ver. O que mudou:

- **Veracidade**: a prévia do hero passou a ter o selo visível
  “Ilustração · dados fictícios” e a URL local `localhost:8000/home`.
  Sairam os contadores de sucesso, os cards flutuantes, os “bullets”,
  o “Ver mais” falso e a busca que não existe no sistema.
- **Fluxo real**: o texto agora fala em criação, aprovação, recusa e
  cancelamento — não em edição de reserva. O formulário tem 3 telas,
  com nome do professor, curso, motivo, data, entrada e saída;
  datas passadas são bloqueadas no front e no servidor.
- **Aprovação**: fila com dois pedidos “Aguardando” (antes eram três),
  decisão com confirmação e nenhuma promessa de estado “somente leitura”.
- **Calendário**: o painel de exemplo mostra horário, recurso, motivo e
  situação, sem nome de professor, com aviso explícito de dado fictício
  e texto de que a coordenação vê todas as reservas.
- **FAQ e CTA**: removeu o detalhe técnico de hash e o CTA duplicado de
  senha; entrou a dúvida real sobre não haver edição de reserva.
- **CSS**: folha reescrita com as classes novas, sem seletores mortos,
  foco visível em azul (branco sobre o CTA vermelho), menu mobile com
  fundo opaco, ícone de fechar e altura limitada. O breakpoint passou
  a 1024px, igual ao do JavaScript.
- **JavaScript**: matriz de calendário com número variável de semanas,
  `roving tabindex`, setas/Home/End/PageUp/PageDown, `aria-current` no dia
  selecionado, rótulo com dia da semana e quantidade de reservas, foco
  devolvido ao destino após clicar no menu, fechamento ao rolar e nome
  acessível estável no botão de tema. A única região `aria-live` ficou
  no subtítulo do dia.
- **Correções descobertas pela suíte nesta branch**: `db.py` tinha um
  bloco de docstring duplicado que impediu a importação do app;
  `static/sw.js` ainda pedia permissão e atribuía um handler direto na
  notificação dentro do worker; `escolherreservaprof3.js` registrava um
  clique duplicado nos cards de gabinete. Os três foram corrigidos.

Validação real da landing em servidor local: página e assets com HTTP 200,
nenhum erro de console, 35 células no calendário do mês corrente, uma única
célula selecionada/tabbable, menu e navegação por seta verificados no DOM.

---

## 3. Orientações para a apresentação

1. Rode `python tests/run.py` na banca e mostre o “tudo certo”.
2. Demonstre, nesta ordem:
   1. Professor edita nome/e-mail em **Configurações** e salva (agora funciona).
   2. Em “Esqueci minha senha”, envia e-mail + nova senha; o pedido aparece
      para o coordenador em **Pedidos de Senha**.
   3. Coordenador aprova; o professor consegue entrar com a senha nova.
   4. Notificação de aprovação no navegador e clique abrindo/focando a aba.
3. Use um e-mail que já exista no banco de demonstração no passo 2: o fluxo
   público não revela se o endereço está cadastrado (com resposta genérica).
4. Em produção, defina `COOKIE_HTTPS=1` para o cookie de sessão ficar com
   `Secure`. Em `http://localhost`, deixar desligado é esperado.
5. As migrations precisam ter sido aplicadas no Supabase, especialmente
   `migracao_pendencias.sql` e `migracao_notificacoes.sql`.

---

## 4. Estado do Git

- Branch local ativa: `main`, com os commits de revisão (padrão
  `docs(<arquivo>): adiciona comentários explicativos`, um commit por arquivo).
- Nenhum `push` foi feito.
- A primeira rodada de revisão tinha sido feita em `General-Review`; como o
  checkout passou a apontar para `main`, as correções desta rodada foram
  aplicadas diretamente na árvore ativa, incluindo os problemas antigos
  que a suíte acusou em `db.py`, `sw.js` e `escolherreservaprof3.js`.
- `main` fica à frente de `origin/main`; para a apresentação, use esta
  árvore local. Não foi criado merge nem push automático.
