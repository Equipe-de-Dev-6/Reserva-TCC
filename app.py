"""API e páginas do Reserva SENAI.

A organização é sempre a mesma: uma seção de configuração no topo, os
auxiliares de sessão e de autorização, as páginas (que exigem sessão) e
por fim as rotas de dados (que exigem sessão, e as de administrativo
exigem também o cargo de Coordenador).
"""

from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.requests import Request
from starlette.responses import JSONResponse
import os
import random

from criptografia import hash_password, verify_password
from consulta_salas import salas_para_tela
from db import supabase
from sessao import SessaoMiddleware
from model import (
    CHAVE_DESCRICAO,
    CHAVE_EQUIPAMENTOS,
    CHAVE_QUANTIDADE,
    CHAVE_SETOR,
    RE_QUANTIDADE,
    Carrinho,
    DecisaoReserva,
    Reserva,
    Sala,
    SalaEdicao,
    Usuario,
    UsuarioAtualizacao,
    categoria_da_sala
)


# ============================================================
# MENU LATERAL
# ============================================================

# O menu é montado aqui, e não escrito no HTML de cada tela. Isso
# resolve dois problemas de uma vez:
#
# 1. Um Coordenador não vê link de Professor, porque o item não está na
#    lista dele. Antes o menu estava copiado em cada arquivo, e a home
#    do Coordinator tinha recebido uma cópia do menu do Professor.
#
# 2. Mudar um destino é editar uma linha aqui, em vez de procurar o
#    link em todas as telas.
#
# Os ícones apontam para static/icons/<nome>.png.

MENU_COORDENADOR = [
    {"rota": "/home_admin", "icone": "home", "rotulo": "Início"},
    {"rota": "/aprovar_reservas_adm", "icone": "reserved", "rotulo": "Aprovar Reservas"},
    {"rota": "/gerenciar_salas_adm", "icone": "classroom", "rotulo": "Gerenciar Salas"},
    {"rota": "/professores_adm", "icone": "user (3)", "rotulo": "Professores"},
    {"rota": "/configuracoes_adm", "icone": "gear", "rotulo": "Configurações"},
    {"rota": "/ajuda", "icone": "interrogation", "rotulo": "Ajuda"},
]

MENU_PROFESSOR = [
    {"rota": "/home", "icone": "home", "rotulo": "Início"},
    {"rota": "/reservar", "icone": "reserved", "rotulo": "Reservar"},
    {"rota": "/reservas_prof", "icone": "calendar", "rotulo": "Minhas Reservas"},
    {"rota": "/calendario_prof", "icone": "calendar", "rotulo": "Calendário"},
    {"rota": "/notificacoes_prof", "icone": "notification", "rotulo": "Notificações"},
    {"rota": "/avisos", "icone": "warning", "rotulo": "Avisos"},
    {"rota": "/configuracoes", "icone": "gear", "rotulo": "Configurações"},
    {"rota": "/ajuda", "icone": "interrogation", "rotulo": "Ajuda"},
]

# A home de cada perfil. O logo da barra lateral aponta para cá, e é
# por isso que a home do Coordenador não levava o usuário para a home
# do Professor.
INICIO_COORDENADOR = "/home_admin"
INICIO_PROFESSOR = "/home"

# Os dois primeiros itens do menu viram atalho no menu de perfil, que
# fica no canto da tela. É o mesmo menu, mostrado em outro lugar.
ATALHOS_USUARIO = 2

# ============================================================
# CONFIGURAÇÃO DA API
# ============================================================

load_dotenv()

app = FastAPI()

# Os caminhos são resolvidos a partir deste arquivo, e não do diretório
# de onde o servidor foi iniciado. Sem isso, `uvicorn --app-dir outro`
# quebra o StaticFiles e todas as páginas respondem 404.
BASE_DIR = Path(__file__).resolve().parent

# Cargo que a aplicação reconhece como administrador. O banco guarda o
# texto com inicial maiúscula ("Coordenador"), e a comparação é feita
# sem caixa para não depender de como o valor foi gravado.
CARGO_COORDENADOR = 'Coordenador'


# ============================================================
# ARQUIVOS ESTÁTICOS
# ============================================================

app.mount(
    "/css",
    StaticFiles(directory=BASE_DIR / "static" / "css"),
    name="css"
)

app.mount(
    "/js",
    StaticFiles(directory=BASE_DIR / "static" / "js"),
    name="js"
)

app.mount(
    "/assets",
    StaticFiles(directory=BASE_DIR / "static" / "assets"),
    name="assets"
)


# ============================================================
# CORS
# ============================================================
#
# A aplicação é servida pela própria API e usa cookie de sessão, ou
# seja, não existe front em outra origem. Por isso o CORS vem desligado
# por padrão: com `allow_origins=["*"]`, qualquer site aberto no
# navegador do professor conseguiria chamar as rotas com a sessão dele.
#
# Para rodar um front separado durante o desenvolvimento, defina
# CORS_ORIGINS no .env com as origens separadas por vírgula.
#
ORIGENS = [
    origem.strip()
    for origem in os.getenv("CORS_ORIGINS", "").split(",")
    if origem.strip()
]

if ORIGENS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ORIGENS,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type"],
        allow_credentials=True
    )


# ============================================================
# SESSÃO
# ============================================================
#
# A sessão é um cookie **criptografado** (sessao.py), não apenas
# assinado: quem abrir o DevTools não lê o e-mail, o nome e o cargo de
# quem está logado, e não consegue forjar um cookie sem a chave.
#
# A chave vem de SECRET_KEY, separada da chave do banco. Usar a
# SUPABASE_KEY para os dois misturava segredos de naturezas diferentes:
# rotacionar a chave do banco derrubava todas as sessões, e vazar uma
# abria as duas coisas de uma vez.
#
CHAVE_SECRETA = os.getenv("SECRET_KEY")

if not CHAVE_SECRETA:
    # Sem esta variável a aplicação não sobe. Gerar uma chave:
    #     python -c "import secrets; print(secrets.token_urlsafe(48))"
    raise RuntimeError(
        "SECRET_KEY não foi configurada. "
        "Defina no .env antes de iniciar a aplicação."
    )

# Oito horas de sessão. Depois disso o cookie expira e o usuário entra
# de novo.
TABELA_DE_TENTATIVAS = "login_tentativas"

DURACAO_DA_SESSAO = int(
    os.getenv("SESSION_HOURS", "8")
) * 60 * 60

app.add_middleware(
    SessaoMiddleware,
    segredo=CHAVE_SECRETA,
    max_age=DURACAO_DA_SESSAO,
    https_only=os.getenv("COOKIE_HTTPS", "").lower() in ("1", "true", "yes")
)


# ============================================================
# TENTATIVAS DE LOGIN
# ============================================================

# O login é a única porta de entrada, então precisa de limite de
# tentativas. A contagem é por endereço IP e fica na tabela
# "login_tentativas", e não na memória do processo: com mais de uma
# instância da aplicação (uvicorn --workers), a memória seria uma por
# instância e o limite valeria só para quem caísse nela.
#
# Só as tentativas que falharam entram na conta. Uma entrada correta
# não gasta cota e ainda zera a contagem do endereço: quem erra a
# senha duas vezes e acerta na terceira não é tratado como ataque.
TENTATIVAS_POR_ENDERECO = 8
JANELA_DE_TENTATIVAS = timedelta(minutes=5)


def _janela_de_tentativas() -> str:
    """O instante que separa as tentativas que ainda contam."""
    return (datetime.now() - JANELA_DE_TENTATIVAS).isoformat()


def _tentativas_restantes(endereco: str) -> int:
    """Quantas tentativas ainda restam para o endereço."""
    try:
        resposta = (
            supabase
            .table(TABELA_DE_TENTATIVAS)
            .select("tentativa")
            .eq("endereco", endereco)
            .gte("tentativa", _janela_de_tentativas())
            .execute()
        )
    except Exception:  # noqa: BLE001
        # Se o banco não responder, o login continua funcionando:
        # travar o acesso de todo mundo por causa de uma falha na
        # contagem seria pior do que deixar passar.
        return TENTATIVAS_POR_ENDERECO

    return TENTATIVAS_POR_ENDERECO - len(resposta.data or [])


def _registrar_tentativa(endereco: str) -> None:
    """Registra uma tentativa que falhou."""
    try:
        (
            supabase
            .table(TABELA_DE_TENTATIVAS)
            .insert({
                "endereco": endereco,
                "tentativa": datetime.now().isoformat()
            })
            .execute()
        )
    except Exception:  # noqa: BLE001
        return

    # As tentativas vencidas não entram na conta e só ocupariam espaço
    # para sempre. A limpeza é occasional, para não custar uma consulta
    # a cada tentativa.
    if random.random() < 0.05:
        try:
            (
                supabase
                .table(TABELA_DE_TENTATIVAS)
                .delete()
                .lt("tentativa", _janela_de_tentativas())
                .execute()
            )
        except Exception:  # noqa: BLE001
            return


def _limpar_tentativas(endereco: str) -> None:
    """Zera a contagem do endereço, depois de um login bem-sucedido."""
    try:
        (
            supabase
            .table(TABELA_DE_TENTATIVAS)
            .delete()
            .eq("endereco", endereco)
            .execute()
        )
    except Exception:  # noqa: BLE001
        return


def _endereco_de(request: Request) -> str:
    """Endereço de quem fez a requisição."""
    return request.client.host if request.client else "desconhecido"


def _falha_de_login(request: Request) -> JSONResponse:
    """Resposta de login recusado.

    E-mail inexistente e senha errada recebem o mesmo texto e o mesmo
    status: responder "e-mail não encontrado" entrega a lista de
    quem tem conta no sistema.
    """
    return JSONResponse(
        status_code=401,
        content={'erro': 'E-mail ou senha inválidos.'}
    )


# ============================================================
# SESSÃO E AUTORIZAÇÃO
# ============================================================

def eh_coordenador(request: Request) -> bool:
    """Informa se a sessão atual pertence a um Coordenador.

    A autorização vem do cargo guardado no banco no login, e não de um
    e-mail escrito no código: assim, quem for promovido no painel do
    Supabase passa a valer na próxima entrada, sem alterar a aplicação.
    """
    cargo = str(request.session.get("usuario_cargo") or "").strip()

    return cargo.lower() == CARGO_COORDENADOR.lower()


def exigir_sessao(request: Request) -> dict:
    """Devolve os dados da sessão, ou interrompe a rota com 401."""
    usuario_id = request.session.get("usuario_id")

    if not usuario_id:
        raise HTTPException(
            status_code=401,
            detail="Usuário não autenticado"
        )

    return {
        "id": usuario_id,
        "email": request.session.get("usuario_email"),
        "nome": request.session.get("usuario_nome"),
        "cargo": request.session.get("usuario_cargo")
    }


def exigir_coordenador(request: Request) -> dict:
    """Exige sessão de Coordenador; professor recebe 403."""
    usuario = exigir_sessao(request)

    if not eh_coordenador(request):
        raise HTTPException(
            status_code=403,
            detail="Esta área é exclusiva do coordenador"
        )

    return usuario


def pagina_de_usuario(request: Request):
    """Devolve a página, ou manda para o login se não houver sessão."""
    if not request.session.get("usuario_id"):
        return RedirectResponse(url="/", status_code=302)

    return None


def pagina_do_coordenador(request: Request):
    """Como pagina_de_usuario, mas só para Coordenador.

    O professor é mandado para a home dele em vez de receber 403, porque
    ele só chega aqui clicando num link da interface.
    """
    if not request.session.get("usuario_id"):
        return RedirectResponse(url="/", status_code=302)

    if not eh_coordenador(request):
        return RedirectResponse(url="/home", status_code=302)

    return None


# Motor de templates. Todas as telas passam por aqui: não existe mais
# entrega direta de arquivo.
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


def renderizar(request: Request, nome_do_arquivo: str, **contexto):
    """Renderiza uma tela pelo Jinja2, com o menu e o usuário prontos.

    Toda tela nasce com as mesmas coisas no contexto — quem está
    logado, o menu do perfil dele e a rota atual —, para que nenhum
    arquivo precise montar isso de novo, e para que um item do menu
    seja marcado como ativo sem a tela saber de onde ele veio.
    """
    eh_admin = eh_coordenador(request)

    # Desde o Starlette 1.x a assinatura e TemplateResponse(request,
    # nome, contexto): o request vem primeiro, e e ele que define o
    # "url_for" e o status da resposta.
    return templates.TemplateResponse(
        request,
        nome_do_arquivo,
        {
            "usuario": {
                "nome": request.session.get("usuario_nome") or "",
                "cargo": (
                    CARGO_COORDENADOR if eh_admin else "Professor"
                ),
            },
            "menu": MENU_COORDENADOR if eh_admin else MENU_PROFESSOR,
            "rota_inicio": (
                INICIO_COORDENADOR if eh_admin else INICIO_PROFESSOR
            ),
            "rota_atual": request.url.path,
            "rota_notificacoes": "/notificacoes_prof",
            "atalhos_usuario": ATALHOS_USUARIO,
            "busca_placeholder": contexto.pop(
                "busca_placeholder", "Buscar..."
            ),
            # A frase de apoio do cabeçalho. Vazio em telas que não
            # têm uma, e ai o componente nem cria o <p>.
            "subtitulo": contexto.pop("subtitulo", ""),
            **contexto,
        },
    )


# ============================================================
# CONVERSÕES
# ============================================================

def montar_horario(data: str, hora: str) -> str:
    """Junta data (AAAA-MM-DD) e hora (HH:MM) no formato do banco.

    A coluna é TIMESTAMPTZ, e o valor vai sem fuso porque é o horário
    que o professor leu no relógio da parede. O banco guarda como UTC e
    devolve sempre em UTC, que é como a API e as telas leem de volta.
    """
    try:
        datetime.strptime(
            f"{data} {hora}",
            "%Y-%m-%d %H:%M"
        )
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Data ou horário inválido"
        )

    return f"{data}T{hora}:00"


def sala_para_json(dados: dict) -> dict:
    """Converte uma linha de "salas" no formato das telas.

    Além dos campos guardados, devolve "contexto", que é o texto de
    "caracteristica" separado em setor, capacidade, equipamentos e
    descrição, e a categoria da sala, classificada no servidor para
    que o navegador não precise repetir a conta.
    """
    sala = Sala.fromJson(dados)

    categoria, rotulo = categoria_da_sala(sala.caracteristica)

    return {
        "id": dados.get("id"),
        **sala.toJson(),
        "reservavel": bool(dados.get("reservavel", False)),
        "contexto": ler_contexto(sala.caracteristica),
        "categoria": categoria,
        "categoriaRotulo": rotulo
    }


def ler_contexto(caracteristica: str) -> dict:
    """Separa o texto da característica nos campos que as telas leem.

    O texto vem do cadastro do campus sempre no mesmo formato:
    "Quantidade de alunos: 32; Setor: TSI; Equipamentos: Projetor;
    Descrição: Sala de aula". Uma sala fora do padrão rende um contexto
    vazio, em vez de derrubar a tela inteira.
    """
    contexto = {
        CHAVE_SETOR: '',
        CHAVE_QUANTIDADE: '',
        CHAVE_EQUIPAMENTOS: [],
        CHAVE_DESCRICAO: ''
    }

    for pedaco in str(caracteristica or '').split(';'):
        if ':' not in pedaco:
            continue

        chave, _, valor = pedaco.partition(':')
        chave = chave.strip().lower()
        valor = valor.strip()

        if not valor:
            continue

        if chave == 'quantidade de alunos':
            if not RE_QUANTIDADE.match(valor):
                # O valor não é um número ("Não informado", por
                # exemplo): a tela esconde a linha de capacidade.
                continue

            contexto[CHAVE_QUANTIDADE] = int(valor)

        elif chave == 'setor':
            contexto[CHAVE_SETOR] = valor

        elif chave == 'equipamentos':
            contexto[CHAVE_EQUIPAMENTOS] = [
                item.strip()
                for item in valor.split(',')
                if item.strip()
            ]

        elif chave.startswith('descri'):
            contexto[CHAVE_DESCRICAO] = valor

    return contexto


def reserva_para_json(dados: dict) -> dict:
    """Converte uma linha de "reservas" no formato das telas.

    O banco guarda data e hora juntas em "data_inicio" e "data_fim". As
    telas do professor leem "data", "horaEntrada" e "horaSaida"; a tela
    de aprovação lê os timestamps crus. A resposta traz as duas formas
    para que nenhuma tela precise recortar o texto por conta própria.

    "sala_nome" vem do próprio cadastro da sala (a consulta embute
    "salas(nome)"), e não da coluna "item", que é uma cópia do nome
    feita no momento da reserva: renomear a sala deixaria as reservas
    antigas mostrando o nome velho.
    """
    inicio = str(dados.get("data_inicio") or "")
    fim = str(dados.get("data_fim") or "")
    sala = dados.get("salas") or {}

    return {
        "id": dados.get("id"),
        "data": inicio[:10],
        "horaEntrada": inicio[11:16],
        "horaSaida": fim[11:16],
        "data_inicio": inicio,
        "data_fim": fim,
        "status": dados.get("status") or STATUS_AGUARDANDO,
        "categoria": dados.get("categoria") or "",
        "item": dados.get("item") or "",
        "sala_nome": (sala.get("nome") if isinstance(sala, dict) else None)
        or dados.get("item") or "",
        "professor": dados.get("professor") or "",
        "curso": dados.get("curso") or "",
        "motivo": dados.get("motivo") or "",
        "criadoEm": dados.get("criado_em") or "",
        "atualizadoEm": dados.get("atualizado_em") or "",
        "salaId": dados.get("sala_id"),
        "usuarioId": dados.get("usuario_id")
    }


def carrinho_para_json(dados: dict) -> dict:
    return {
        "id": dados.get("id"),
        **Carrinho.fromJson(dados).toJson()
    }


# ============================================================
# RESERVAS
# ============================================================

STATUS_AGUARDANDO = "aguardando"
STATUS_APROVADA = "aprovada"
STATUS_NEGADA = "negada"
STATUS_CANCELADA = "cancelada"

DECISOES_RESERVA = (
    STATUS_APROVADA,
    STATUS_NEGADA,
    STATUS_CANCELADA,
)


# ============================================================
# PÁGINAS
# ============================================================

# ------------------------------------------------------------
# LOGIN
# ------------------------------------------------------------

@app.get("/")
async def inicio(request: Request):
    if request.session.get("usuario_id"):
        destino = "/home_admin" if eh_coordenador(request) else "/home"

        return RedirectResponse(url=destino, status_code=302)

    return renderizar(
        request,
        "auth/login.html",
        pagina="Login"
    )


@app.post('/login')
async def login_post(request: Request):
    """Processa login do usuário"""
    endereco = _endereco_de(request)

    if _tentativas_restantes(endereco) <= 0:
        raise HTTPException(
            status_code=429,
            detail="Muitas tentativas. Aguarde alguns minutos e tente de novo."
        )

    dados = await request.form()
    email = (dados.get('email') or '').strip().lower()
    senha = dados.get('senha') or ''

    resposta = (
        supabase
        .table("usuarios")
        .select("*")
        .eq("email", email)
        .execute()
    )

    usuarios = resposta.data or []

    if not usuarios:
        _registrar_tentativa(endereco)

        # Mesma resposta da senha errada, para não revelar quais
        # e-mails existem.
        return _falha_de_login(request)

    usuario = usuarios[0]

    if not verify_password(senha, usuario.get("senha") or ""):
        _registrar_tentativa(endereco)

        return _falha_de_login(request)

    # Login certo: a contagem de tentativas do endereço é zerada.
    _limpar_tentativas(endereco)

    # Sessão nova a cada entrada: sem isso, um cookie que sobrou de uma
    # sessão anterior continuaria valendo depois do login.
    request.session.clear()

    request.session["usuario_id"] = usuario["id"]
    request.session["usuario_email"] = usuario["email"]
    request.session["usuario_nome"] = usuario["nome"]
    request.session["usuario_cargo"] = usuario.get("cargo") or ""

    # O login responde em JSON com o perfil, e não com um redirect:
    # a tela de login chama a rota com fetch e só navega para a home
    # depois de ler o campo "cargo". Um RedirectResponse aqui faria o
    # fetch reenviar o POST para a home, que só aceita GET.
    eh_admin = eh_coordenador(request)

    return {'cargo': 'coordenador' if eh_admin else 'prof'}


@app.post("/logout")
async def logout(request: Request):
    # Encerra a sessão do usuário
    request.session.clear()

    # Redireciona para a página inicial
    return RedirectResponse(
        url="/",
        status_code=303
    )


@app.get("/usuario_logado")
async def usuario_logado(request: Request):
    """Retorna os dados do usuário armazenados na sessão"""

    nome = request.session.get("usuario_nome")

    if not nome:
        raise HTTPException(
            status_code=401,
            detail="Usuário não autenticado"
        )

    return {
        "id": request.session.get("usuario_id"),
        "nome": nome,
        "email": request.session.get("usuario_email"),
        "cargo": (
            CARGO_COORDENADOR
            if eh_coordenador(request)
            else "Professor"
        )
    }


# ============================================================
# SERVICE WORKER
# ============================================================

@app.get("/sw.js")
def service_worker():
    """Serve o service worker na raiz, como esperado pelo navegador."""
    return FileResponse(
        BASE_DIR / "static" / "sw.js",
        media_type="application/javascript",
    )


# ------------------------------------------------------------
# INÍCIO PROFESSOR
# ------------------------------------------------------------

# ------------------------------------------------------------
# INÍCIO ADMIN
# ------------------------------------------------------------


# ------------------------------------------------------------
# CADASTRO
# ------------------------------------------------------------

@app.get("/cadastro")
def cadastro(request: Request):
    """Cadastro de usuário.

    A tela fica na área do Coordenador porque quem decide quem entra
    no sistema é ele: qualquer visitante poderia criar uma conta com
    qualquer cargo, e com o cargo errado ainda ganhava acesso de
    administrador.
    """
    return pagina_do_coordenador(request) or renderizar(
        request,
        "auth/cadastro.html",
        pagina="Cadastro"
    )


# ------------------------------------------------------------
# REDEFINIR SENHA
# ------------------------------------------------------------

@app.get("/redefinir_senha")
def redefinir_senha(request: Request):
    return renderizar(
        request,
        "auth/redefsenha.html",
        pagina="Redefinir senha"
    )


# ------------------------------------------------------------
# ESQUECEU SENHA
# ------------------------------------------------------------

@app.get("/esqueceu_senha")
def esqueceu_senha(request: Request):
    return renderizar(
        request,
        "auth/esqueceu_senha.html",
        pagina="Esqueci minha senha"
    )


# ============================================================
# PÁGINAS DO PROFESSOR
# ============================================================

# Cada página do professor é um GET que só exige sessão. Estão juntos
# numa lista para não repetir a mesma rota oito vezes no arquivo.
# Cada entrada traz o template, o texto da busca e a frase de apoio do
# cabeçalho. A frase ficava copiada e colada em todas as telas — e era
# a mesma em nove delas, incluindo o calendário e as configurações,
# onde não fazia sentido ("faça novos agendamentos").
PAGINAS_DO_PROFESSOR = {
    "/home": (
        "professor/paginainicialprofessor.html",
        "Buscar por sala ou professor...",
        ""
    ),
    "/reservar": (
        "professor/reservar_tela_prof.html",
        "Buscar sala, laboratório ou gabinete...",
        "Escolha o que deseja reservar"
    ),
    "/reservas_prof": (
        "professor/reservasprof.html",
        "Buscar por sala ou professor...",
        "Acompanhe e gerencie suas reservas"
    ),
    "/calendario_prof": (
        "professor/calendario.html",
        "Buscar por sala ou professor...",
        "Veja as reservas de cada dia"
    ),
    "/notificacoes_prof": (
        "professor/notificacoes.html",
        "Buscar nas notificações...",
        "Avisos e mudanças nas suas reservas"
    ),
    "/escolher_reserva_salas": (
        "professor/reservar/salas/reservar-sala.html",
        "Buscar sala por nome ou tipo...",
        "Escolha a sala"
    ),
    "/escolher_reserva_laboratorios": (
        "professor/reservar/laboratorios/reservar-laboratorio.html",
        "Buscar laboratório por nome ou tipo...",
        "Escolha o laboratório"
    ),
    "/escolher_reserva_gabinetes": (
        "professor/reservar/gabinete/reservar-gabinete.html",
        "Buscar gabinete por nome ou tipo...",
        "Escolha o gabinete"
    ),
    "/passo2_reserva_prof": (
        "professor/reservar/salas/reservar-sala-detalhes.html",
        "Buscar por sala ou professor...",
        "Detalhes da reserva"
    ),
    "/passo3_reserva_prof": (
        "professor/reservar/salas/reservar-sala-confirmacao.html",
        "Buscar por sala ou professor...",
        "Solicitação enviada"
    ),
    "/avisos": (
        "avisos.html",
        "Buscar aviso por título...",
        "Avisos importantes do campus"
    ),
    "/configuracoes": (
        "configuracoes.html",
        "Buscar uma configuração...",
        "Ajuste o seu perfil e a senha"
    ),
    "/ajuda": (
        "ajuda.html",
        "Buscar uma dúvida...",
        "Como usar o sistema"
    ),
}


def _criar_paginas():
    """Registra uma rota protegida por sessão para cada página."""
    for caminho, (arquivo, busca, frase) in PAGINAS_DO_PROFESSOR.items():

        def rota(request: Request, arquivo=arquivo, busca=busca, frase=frase):
            return pagina_de_usuario(request) or renderizar(
                request,
                arquivo,
                pagina=arquivo.rsplit("/", 1)[-1].removesuffix(".html"),
                busca_placeholder=busca,
                subtitulo=frase
            )

        rota.__name__ = caminho.strip("/").replace("/", "_")

        app.get(caminho)(rota)


_criar_paginas()


# ============================================================
# PÁGINAS DO COORDENADOR
# ============================================================

# Telas que só o Coordenador enxerga. O professor que abrir um destes
# endereços volta para a home dele.
# As telas do Coordenador já foram convertidas para o Jinja2: elas
# estendem "base.html" e recebem o menu pelo contexto. Cada entrada
# traz o template e o texto do campo de busca, que muda de tela para
# tela.
PAGINAS_DO_COORDENADOR = {
    "/home_admin": (
        "admin/home.html",
        "Buscar por sala ou professor..."
    ),
    "/aprovar_reservas_adm": (
        "admin/aprovar_reservas.html",
        "Buscar por professor ou sala..."
    ),
    "/gerenciar_salas_adm": (
        "admin/gerenciar_salas.html",
        "Buscar sala por nome ou tipo..."
    ),
    "/professores_adm": (
        "admin/professores.html",
        "Buscar professor por nome ou e-mail..."
    ),
    "/configuracoes_adm": (
        "admin/configuracoes.html",
        "Buscar uma configuração..."
    ),
}


def _criar_paginas_do_coordenador():
    for caminho, (arquivo, busca) in PAGINAS_DO_COORDENADOR.items():

        def rota(request: Request, arquivo=arquivo, busca=busca):
            return pagina_do_coordenador(request) or renderizar(
                request,
                arquivo,
                pagina=arquivo.rsplit("/", 1)[-1].removesuffix(".html"),
                busca_placeholder=busca
            )

        rota.__name__ = caminho.strip("/").replace("/", "_")

        app.get(caminho)(rota)


_criar_paginas_do_coordenador()


@app.get("/reservar_admin")
def reservar_admin(request: Request):
    """Reserva do Coordenador.

    A tela de reserva é a mesma para os dois perfis: o que muda depois é
    a quem compete aprovar o pedido.
    """
    return pagina_do_coordenador(request) or RedirectResponse(
        url="/reservar",
        status_code=302
    )


@app.get("/reservas_admin")
def reservas_admin(request: Request):
    """Reservas do Coordenador.

    A listagem é a mesma tela usada pelo professor e pelo Coordenador,
    que nela enxerga os pedidos de todo mundo.
    """
    return pagina_do_coordenador(request) or RedirectResponse(
        url="/reservas_prof",
        status_code=302
    )


# ============================================================
# USUÁRIOS
# ============================================================

# ------------------------------------------------------------
# LISTAR USUÁRIOS
# ------------------------------------------------------------

@app.get("/usuarios")
def listar_usuarios(request: Request):

    exigir_coordenador(request)

    resposta = (
        supabase
        .table("usuarios")
        .select("*")
        .order("nome")
        .execute()
    )

    # Monta uma resposta segura, removendo a coluna de senha/hash antes de
    # enviar os dados dos usuários para o frontend.
    usuarios = []

    for dados in (resposta.data or []):

        usuarios.append({
            "id": dados.get("id"),
            "nome": dados.get("nome"),
            "email": dados.get("email"),
            "cargo": dados.get("cargo")
        })

    return usuarios


# ------------------------------------------------------------
# CADASTRAR USUÁRIO
# ------------------------------------------------------------

@app.post("/usuarios", status_code=201)
def cadastrar_usuario(usuario: Usuario, request: Request):

    exigir_coordenador(request)

    # O login normaliza o e-mail antes de procurar, então o cadastro
    # grava o mesmo formato. Sem isto, " Ana@x.com " e "ana@x.com"
    # seriam duas contas, e a segunda nunca acharia a senha da primeira.
    email = usuario.email.strip().lower()

    # Consulta o Supabase antes de inserir para impedir duplicidade de
    # e-mails. Essa verificação é feita diretamente no banco de dados.
    resposta = (
        supabase
        .table("usuarios")
        .select("*")
        .eq("email", email)
        .execute()
    )

    if resposta.data:

        raise HTTPException(
            status_code=400,
            detail="Usuário já cadastrado"
        )

    # Cadastra o usuário somente com o hash da senha. A senha original
    # permanece apenas na memória durante esta requisição.
    dados_usuario = usuario.toJson()
    dados_usuario["email"] = email
    dados_usuario["senha"] = hash_password(usuario.senha)

    # O Supabase recebe o hash, nunca a senha original.
    resposta = (
        supabase
        .table("usuarios")
        .insert(dados_usuario)
        .execute()
    )

    if not resposta.data:

        raise HTTPException(
            status_code=400,
            detail="Erro ao cadastrar usuário"
        )

    return {
        "mensagem": "Usuário cadastrado com sucesso"
    }


# ------------------------------------------------------------
# ATUALIZAR USUÁRIO
# ------------------------------------------------------------

@app.put("/usuarios/{usuario_id}")
def atualizar_usuario(
    usuario_id: int,
    alteracao: UsuarioAtualizacao,
    request: Request
):

    exigir_coordenador(request)

    dados = alteracao.toJson()

    if not dados:
        raise HTTPException(
            status_code=400,
            detail="Nenhum campo para atualizar"
        )

    if "email" in dados:
        dados["email"] = dados["email"].strip().lower()

        repetido = (
            supabase
            .table("usuarios")
            .select("*")
            .eq("email", dados["email"])
            .neq("id", usuario_id)
            .execute()
        )

        if repetido.data:
            raise HTTPException(
                status_code=400,
                detail="Usuário já cadastrado"
            )

    resposta = (
        supabase
        .table("usuarios")
        .update(dados)
        .eq("id", usuario_id)
        .execute()
    )

    if not resposta.data:

        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado"
        )

    return {
        "id": usuario_id,
        "nome": dados.get("nome", resposta.data[0].get("nome")),
        "email": dados.get("email", resposta.data[0].get("email")),
        "cargo": dados.get("cargo", resposta.data[0].get("cargo"))
    }


# ------------------------------------------------------------
# EXCLUIR USUÁRIO
# ------------------------------------------------------------

@app.delete("/usuarios/{usuario_id}")
def excluir_usuario(usuario_id: int, request: Request):

    usuario = exigir_coordenador(request)

    if usuario["id"] == usuario_id:
        raise HTTPException(
            status_code=400,
            detail="Você não pode excluir o próprio usuário"
        )

    # A reserva impede a exclusão de quem já tem histórico (ON DELETE
    # RESTRICT); a API transforma a recusa do banco em erro legível.
    resposta = (
        supabase
        .table("usuarios")
        .delete()
        .eq("id", usuario_id)
        .execute()
    )

    if not resposta.data:

        raise HTTPException(
            status_code=400,
            detail="Usuário não encontrado ou com reservas registradas"
        )

    return {"mensagem": "Usuário excluído"}


# ============================================================
# SALAS
# ============================================================

# ------------------------------------------------------------
# LISTAR SALAS
# ------------------------------------------------------------

@app.get("/salas")
def listar_salas(request: Request):

    exigir_sessao(request)

    # Só chegam ao navegador as salas que aparecem nas telas de reserva.
    dados = salas_para_tela(supabase)

    return [sala_para_json(linha) for linha in dados]


# ------------------------------------------------------------
# LISTAR TODAS AS SALAS (COORDENADOR)
# ------------------------------------------------------------

@app.get("/admin/salas")
def listar_salas_admin(request: Request):

    exigir_coordenador(request)

    resposta = (
        supabase
        .table("salas")
        .select("*")
        .order("nome")
        .execute()
    )

    return [sala_para_json(linha) for linha in (resposta.data or [])]


# ------------------------------------------------------------
# BUSCAR SALA
# ------------------------------------------------------------

@app.get("/salas/{sala_id}")
def buscar_sala(sala_id: int, request: Request):

    exigir_sessao(request)

    resposta = (
        supabase
        .table("salas")
        .select("*")
        .eq("id", sala_id)
        .execute()
    )

    if not resposta.data:

        raise HTTPException(
            status_code=404,
            detail="Sala não encontrada"
        )

    return sala_para_json(resposta.data[0])


# ------------------------------------------------------------
# CADASTRAR SALA
# ------------------------------------------------------------

@app.post("/salas", status_code=201)
def cadastrar_sala(sala: SalaEdicao, request: Request):

    exigir_coordenador(request)

    dados = sala.toJson()
    dados["historico"] = {}

    resposta = (
        supabase
        .table("salas")
        .insert(dados)
        .execute()
    )

    if not resposta.data:

        raise HTTPException(
            status_code=400,
            detail="Erro ao cadastrar sala"
        )

    return sala_para_json(resposta.data[0])


# ------------------------------------------------------------
# ATUALIZAR SALA
# ------------------------------------------------------------

@app.put("/salas/{sala_id}")
def atualizar_sala(sala_id: int, sala: SalaEdicao, request: Request):

    exigir_coordenador(request)

    resposta = (
        supabase
        .table("salas")
        .update(sala.toJson())
        .eq("id", sala_id)
        .execute()
    )

    if not resposta.data:

        raise HTTPException(
            status_code=404,
            detail="Sala não encontrada"
        )

    return sala_para_json(resposta.data[0])


# ------------------------------------------------------------
# EXCLUIR SALA
# ------------------------------------------------------------

@app.delete("/salas/{sala_id}")
def excluir_sala(sala_id: int, request: Request):

    exigir_coordenador(request)

    # A sala com histórico de reserva não é apagada pelo banco
    # (ON DELETE RESTRICT); a API transforma a recusa em erro legível.
    resposta = (
        supabase
        .table("salas")
        .delete()
        .eq("id", sala_id)
        .execute()
    )

    if not resposta.data:

        raise HTTPException(
            status_code=400,
            detail="Sala não encontrada ou com reservas registradas"
        )

    return {"mensagem": "Sala excluída"}


# ============================================================
# CARRINHOS
# ============================================================

# ------------------------------------------------------------
# LISTAR CARRINHOS
# ------------------------------------------------------------

@app.get("/carrinhos")
def listar_carrinhos(request: Request):

    exigir_sessao(request)

    resposta = (
        supabase
        .table("carrinhos")
        .select("*")
        .order("nome")
        .execute()
    )

    return [
        carrinho_para_json(dados)
        for dados in (resposta.data or [])
    ]


# ============================================================
# RESERVAS
# ============================================================
#
# As reservas são gravadas na tabela "reservas". Toda reserva nasce
# com o status "aguardando" e só muda de status pela rota de
# decisão, que é restrita ao Coordenador (com exceção do cancelamento,
# que o dono do pedido pode fazer).

# ------------------------------------------------------------
# LISTAR RESERVAS
# ------------------------------------------------------------

@app.get("/reservas")
def listar_reservas(request: Request, status: str | None = None):

    usuario = exigir_sessao(request)

    consulta = (
        supabase
        .table("reservas")
        # A sala vem embutida para que o nome exibido na tela de
        # aprovação seja o do cadastro, e não a cópia guardada no
        # momento da reserva.
        .select("*, salas(nome)")
        .order("data_inicio", desc=True)
    )

    # O professor enxerga apenas os próprios pedidos. O Coordenador
    # enxerga todos, porque é quem aprova.
    if not eh_coordenador(request):
        consulta = consulta.eq("usuario_id", usuario["id"])

    # O filtro de status é opcional, para as abas da tela de reservas.
    if status:
        consulta = consulta.eq(
            "status",
            status.strip().lower()
        )

    resposta = consulta.execute()

    return [
        reserva_para_json(dados)
        for dados in (resposta.data or [])
    ]


# ------------------------------------------------------------
# CRIAR RESERVA
# ------------------------------------------------------------

@app.post("/reservas", status_code=201)
def criar_reserva(reserva: Reserva, request: Request):

    usuario = exigir_sessao(request)

    inicio = montar_horario(reserva.data, reserva.horaEntrada)
    fim = montar_horario(reserva.data, reserva.horaSaida)

    if fim <= inicio:
        raise HTTPException(
            status_code=400,
            detail="A hora de saída deve ser depois da entrada"
        )

    sala_id = None

    # Quando a tela de escolha sabe o id da sala, ele é gravado e a
    # reserva passa a valer a restrição de horário do banco. Sem o id
    # (gabinete e carrinho ainda não têm cadastro), o nome fica em "item".
    if reserva.salaId is not None:
        existe = (
            supabase
            .table("salas")
            .select("id")
            .eq("id", reserva.salaId)
            .execute()
        )

        if not existe.data:
            raise HTTPException(
                status_code=400,
                detail="Sala não encontrada"
            )

        sala_id = reserva.salaId

    dados_reserva = {
        "usuario_id": usuario["id"],
        "data_inicio": inicio,
        "data_fim": fim,
        # A reserva entra como pendente: ninguém reserva direto,
        # o Coordenador responde depois em /reservas/{id}/decisao.
        "status": STATUS_AGUARDANDO,
        "categoria": reserva.categoria,
        "item": reserva.item,
        "professor": reserva.professor,
        "curso": reserva.curso,
        "motivo": reserva.motivo
    }

    if sala_id is not None:
        dados_reserva["sala_id"] = sala_id

    try:
        resposta = (
            supabase
            .table("reservas")
            .insert(dados_reserva)
            .execute()
        )
    except Exception as erro:  # noqa: BLE001
        # 23P01 é a violação da restrição de horário sobreposto: outra
        # reserva da mesma sala ocupa este intervalo.
        if _codigo_do_erro(erro) == '23P01':
            raise HTTPException(
                status_code=409,
                detail="Esta sala já está reservada neste horário"
            )

        raise

    if not resposta.data:
        raise HTTPException(
            status_code=502,
            detail="Não foi possível registrar a reserva"
        )

    return reserva_para_json(resposta.data[0])


def _codigo_do_erro(erro: Exception) -> str:
    """Pega o código do erro do PostgREST, quando existe.

    A biblioteca levanta uma exceção com o corpo da resposta do
    Supabase; o código do PostgreSQL vem em "code".
    """
    codigo = getattr(erro, "code", None)

    if codigo:
        return str(codigo)

    corpo = getattr(erro, "args", None)

    if isinstance(corpo, dict):
        return str(corpo.get("code", ""))

    return ""


# ------------------------------------------------------------
# DECIDIR SOBRE A RESERVA
# ------------------------------------------------------------

@app.patch("/reservas/{reserva_id}/decisao")
def decidir_reserva(
    reserva_id: int,
    corpo: DecisaoReserva,
    request: Request
):

    usuario = exigir_sessao(request)

    decisao = corpo.decisao.strip().lower()

    # Aprovar e recusar são exclusivos do Coordenador. Cancelar, não:
    # o professor precisa poder desistir do próprio pedido enquanto ele
    # ainda está na mão dele.
    if not eh_coordenador(request):

        if decisao != STATUS_CANCELADA:
            raise HTTPException(
                status_code=403,
                detail="Somente o coordenador decide sobre uma reserva"
            )

        dono = (
            supabase
            .table("reservas")
            .select("usuario_id")
            .eq("id", reserva_id)
            .execute()
        )

        if not dono.data:
            raise HTTPException(
                status_code=404,
                detail="Reserva não encontrada"
            )

        if dono.data[0].get("usuario_id") != usuario["id"]:
            raise HTTPException(
                status_code=403,
                detail="Esta reserva não é sua"
            )

    try:
        resposta = (
            supabase
            .table("reservas")
            .update({"status": decisao})
            .eq("id", reserva_id)
            .execute()
        )
    except Exception as erro:  # noqa: BLE001
        if _codigo_do_erro(erro) == '23P01':
            raise HTTPException(
                status_code=409,
                detail="Esta sala já está reservada neste horário"
            )

        raise

    if not resposta.data:
        raise HTTPException(
            status_code=404,
            detail="Reserva não encontrada"
        )

    return reserva_para_json(resposta.data[0])