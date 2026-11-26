# Revisão técnica — Reserva SENAI

Revisão completa feita na branch `General-Review` antes da apresentação.
O objetivo foi percorrer backend, SQL, documentação, templates e JavaScript,
comentar o que cada trecho faz, corrigir bugs e falhas de segurança e deixar
uma suíte de testes que rode sem dependências externas.

> **Importante:** nada foi enviado (`push`) para o repositório remoto. Todo o
> trabalho está nos commits locais da branch `General-Review`.

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
 24 verificações em check_frontend.js  — 0 falhas
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

- Branch local: `General-Review`, com os commits de revisão (padrão
  `docs(<arquivo>): adiciona comentários explicativos`, um commit por arquivo).
- Nenhum `push` foi feito.
- O remoto teve um merge da revisão seguido de revert. Ao mesclar `main`
  na `General-Review`, os conflitos apareceram em `app.py`,
  `tests/test_api.py` e `wiring_output.txt`, e a mesclagem também traria
  de volta o revert nos demais arquivos. A resolução manteve o conteúdo
  revisado da `General-Review` em todos eles e registrou o merge local
  (`36b9da8`). `git merge-tree --write-tree main General-Review` agora não
  aponta conflito: o PR para `main` pode ser aberto sem conflitos.
- `General-Review` está à frente de `origin/General-Review`; o push ainda
  não foi feito. Para a apresentação, use esta árvore local.

---

## 5. Ajustes na landing (branch `deploy`)

- **Fluxo de senha**: a FAQ deixou de falar em “ID de redefinição” e agora
  descreve o fluxo implementado: e-mail + nova senha + confirmação, pedido
  registrado com hash e aprovação do coordenador em **Pedidos de Senha**.
- **Vitrine do coordenador**: o módulo **Pedidos de Senha**, que já existe no
  menu real, passou a aparecer também na lista da página inicial.
- **Datas**: os rótulos fixos “Novembro 2026” saíram do HTML e viraram texto
  neutro até o `landing.js` calcular o mês atual; o rodapé recebe o ano corrente.
- **Acesso offline**: removido o carregamento de Google Fonts. A pilha usa
  Inter local quando disponível e cai para a fonte do sistema.
- **Acessibilidade/UX**: a lista de reservas do calendário de exemplo ficou
  `aria-live="polite"`, o menu mobile fecha ao clicar fora e o painel do
  calendário só é montado quando todos os seus elementos existem.
- **Cache**: CSS e JS da landing passaram para `?v=2`.
- **Testes**: `check_frontend.js` ganhou 7 checagens de regressão da landing;
  `python tests/run.py` continua terminando em “tudo certo”. Também foi feita
  uma abertura real da página: sem erros de console e todos os assets 200.
- Nenhum `push` foi feito; os commits desta rodada ficaram na `deploy`.
