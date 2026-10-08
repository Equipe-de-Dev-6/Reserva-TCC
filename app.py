from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from fastapi.responses import RedirectResponse
from criptografia import hash_password, verify_password
from dotenv import load_dotenv
from datetime import datetime
import os

from db import supabase
from model import (
    Usuario,
    Sala,
    Carrinho,
    Reserva,
    DecisaoReserva
)


# ============================================================
# CONFIGURAÇÃO DA API
# ============================================================

app = FastAPI()

# ============================================================
# ARQUIVOS ESTÁTICOS
# ============================================================

app.mount(
    "/css",
    StaticFiles(directory="static/css"),
    name="css"
)

app.mount(
    "/js",
    StaticFiles(directory="static/js"),
    name="js"
)

app.mount(
    "/assets",
    StaticFiles(directory="static/assets"),
    name="assets"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# MIDDLEWARE DE SESSÃO
# ============================================================
load_dotenv()
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
app.add_middleware(SessionMiddleware, secret_key=SUPABASE_KEY)


# ============================================================
# PÁGINAS
# ============================================================

# ------------------------------------------------------------
# LOGIN
# ------------------------------------------------------------

@app.get("/")
async def inicio(request: Request):
    if request.session.get("usuario"):
        return RedirectResponse(
            url="/home",
            status_code=302
        )

    return FileResponse("templates/login.html")


# E-mail do administrador. É conferido aqui para escolher a home de
# cada perfil e em eh_coordenador, que protege a rota de decisão
# sobre as reservas.
EMAIL_ADMIN = "lthiegue@sp.senai.br"


def eh_coordenador(request: Request) -> bool:
    """Informa se a sessão atual pertence ao administrador.

    A comparação é feita em caixa baixa e sem espaços para não
    depender de como o e-mail foi gravado no banco.
    """
    email = (request.session.get("usuario_email") or "").strip().lower()

    return bool(email) and email == EMAIL_ADMIN


@app.post('/login')
async def login_post(request: Request):
    """Processa login do usuário"""
    dados = await request.form()
    email = (dados.get('email') or '').strip().lower()
    senha = dados.get('senha') or ''

    # Busca o usuário no Supabase
    resposta = (
        supabase
        .table("usuarios")
        .select("*")
        .eq("email", email)
        .execute()
    )

    usuarios = resposta.data or []

    if not usuarios:
        return {'erro': 'E-mail não encontrado'}

    usuario = usuarios[0]

    if not verify_password(senha, usuario.get("senha", "")):
        return {'erro': 'Senha incorretos'}

    # Armazena na sessão
    request.session["usuario_id"] = usuario["id"]
    request.session["usuario_email"] = usuario["email"]
    request.session["usuario_nome"] = usuario["nome"]
    request.session["usuario_cargo"] = usuario["cargo"]

    # O login responde em JSON com o perfil, e não com um redirect:
    # a tela de login chama a rota com fetch e só navega para a home
    # depois de ler o campo "status". Um RedirectResponse aqui faria
    # o fetch reenviar o POST para /home_admin, que só aceita GET.
    # A comparação é feita em caixa baixa para não depender de como
    # o e-mail foi gravado no banco.
    if usuario["email"].strip().lower() == EMAIL_ADMIN:
        return {'cargo': 'coordenador'}

    return {'cargo': 'prof'}


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
        "nome": nome
    }

# ============================================================
# SERVICE WORKER
# ============================================================

@app.get("/sw.js")
def service_worker():
    """Serve o service worker na raiz, como esperado pelo navegador."""
    return FileResponse(
        "static/sw.js",
        media_type="application/javascript",
    )


# ------------------------------------------------------------
# INÍCIO PROFESSOR
# ------------------------------------------------------------

@app.get("/home")
def home_professor(request: Request):  # ✅ Precisa ter request
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/paginainicialprofessor.html")


# ------------------------------------------------------------
# INÍCIO ADMIN
# ------------------------------------------------------------

@app.get("/home_admin")
def home_admin(request: Request):
    """Home do admin - protegida por sessão"""
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/paginainicialadm.html")


# ------------------------------------------------------------
# CADASTRO
# ------------------------------------------------------------

@app.get("/cadastro")
def cadastro():
    return FileResponse("templates/cadastro.html")


# ------------------------------------------------------------
# REDEFINIR SENHA
# ------------------------------------------------------------

@app.get("/redefinir_senha")
def redefinir_senha():
    return FileResponse("templates/redefsenha.html")


# ------------------------------------------------------------
# ESQUECEU SENHA
# ------------------------------------------------------------

@app.get("/esqueceu_senha")
def esqueceu_senha():
    return FileResponse("templates/esqueceu_senha.html")


# ============================================================
# PÁGINAS DO PROFESSOR
# ============================================================

# ------------------------------------------------------------
# RESERVAS
# ------------------------------------------------------------

@app.get("/reservar")
def reservar(request: Request):

    # Verifica se o usuário está logado
    if "usuario_id" not in request.session:
        return RedirectResponse(
            url="/",
            status_code=302
        )

    # Abre a página de reservas
    return FileResponse("templates/reservar_tela_prof.html")


# ------------------------------------------------------------
# CALENDÁRIO
# ------------------------------------------------------------

@app.get("/calendario_prof")
def calendario_prof(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/calendarioprof.html")


# ------------------------------------------------------------
# NOTIFICAÇÕES
# ------------------------------------------------------------

@app.get("/notificacoes_prof")
def notificacoes_prof(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/notificacoesprof.html")


# ------------------------------------------------------------
# ESCOLHER RESERVA - SALAS
# ------------------------------------------------------------

@app.get("/escolher_reserva_salas")
def escolher_reserva_salas(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/escolherreservaprof.html")


# ------------------------------------------------------------
# ESCOLHER RESERVA - LABORATÓRIOS
# ------------------------------------------------------------

@app.get("/escolher_reserva_laboratorios")
def escolher_reserva_laboratorios(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/escolherreservaprof2.html")


# ------------------------------------------------------------
# ESCOLHER RESERVA - GABINETES
# ------------------------------------------------------------

@app.get("/escolher_reserva_gabinetes")
def escolher_reserva_gabinetes(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/escolherreservaprof3.html")


# ------------------------------------------------------------
# AJUDA
# ------------------------------------------------------------

@app.get("/ajuda")
def ajuda(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/ajuda.html")


@app.get("/avisos")
def avisos(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/avisos.html")


@app.get("/configuracoes")
def configuracoes(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/configuracoes.html")


# ============================================================
# PÁGINAS DO ADMIN
# ============================================================

@app.get('/reservas_prof')
def reservas_prof(request: Request):
    if 'usuario_id' not in request.session:
        return RedirectResponse(url='/', status_code=302)
    return FileResponse('templates/reservasprof.html')


# ------------------------------------------------------------
# APROVAR RESERVAS
# ------------------------------------------------------------

@app.get("/aprovar_reservas_adm")
def aprovar_reservas_adm(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/aprovar_reservas_adm.html")


# ------------------------------------------------------------
# CONFIGURAÇÕES - ADMIN
# ------------------------------------------------------------

@app.get("/configuracoes_adm")
def configuracoes_adm(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/configuracoes_adm.html")


# ------------------------------------------------------------
# GERENCIAR SALAS - ADMIN
# ------------------------------------------------------------

@app.get("/gerenciar_salas_adm")
def gerenciar_salas_adm(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/gerenciar_salas_adm.html")


# ------------------------------------------------------------
# PROFESSORES - ADMIN
# ------------------------------------------------------------

@app.get("/professores_adm")
def professores_adm(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/professores_adm.html")



# ============================================================
# PÁGINAS DO ADMIN
# ============================================================

# ------------------------------------------------------------
# RESERVAR - ADMIN
# ------------------------------------------------------------

@app.get("/reservar_admin")
def reservar_admin(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)

    # A tela de reserva é a mesma para os dois perfis: o que muda
    # depois é a quem compete aprovar o pedido.
    return RedirectResponse(url="/reservar", status_code=302)


# ------------------------------------------------------------
# RESERVAS - ADMIN
# ------------------------------------------------------------

@app.get("/reservas_admin")
def reservas_admin(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)

    # A listagem de reservas já é a mesma tela usada pelo professor
    # e pelo administrador, que nela enxerga os pedidos de todos.
    return RedirectResponse(url="/reservas_prof", status_code=302)


@app.get("/passo2_reserva_prof")
def passo2_reserva_prof(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/passo2reservaprof.html")


@app.get("/passo02_reserva_prof")
def passo02_reserva_prof(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/passo02reservaprof.html")


@app.get("/passo002_reserva_prof")
def passo002_reserva_prof(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/passo002reservaprof.html")

# ============================================================
# CONFIRMAÇÃO DE RESERVA
# ============================================================

@app.get("/passo3_reserva_prof")
def passo3_reserva_prof(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/passo3reservaprof.html")


@app.get("/passo03_reserva_prof")
def passo03_reserva_prof(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/passo03reservaprof.html")


@app.get("/passo003_reserva_prof")
def passo003_reserva_prof(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/passo003reservaprof.html")

# ============================================================
# USUÁRIOS
# ============================================================

# ------------------------------------------------------------
# LISTAR USUÁRIOS
# ------------------------------------------------------------

@app.get("/usuarios")
def listar_usuarios():

    resposta = (
        supabase
        .table("usuarios")
        .select("*")
        .execute()
    )

    # Monta uma resposta segura, removendo a coluna de senha/hash antes de
    # enviar os dados dos usuários para o frontend.
    usuarios = []

    for dados in resposta.data:

        # Não expor hashes de senha na resposta da API.
        usuarios.append({
            "id": dados.get("id"),
            "nome": dados.get("nome"),
            "email": dados.get("email"),
        })

    return usuarios


# ------------------------------------------------------------
# CADASTRAR USUÁRIO
# ------------------------------------------------------------

@app.post("/usuarios")
def cadastrar_usuario(usuario: Usuario):

    # Consulta o Supabase antes de inserir para impedir duplicidade de
    # e-mails. Essa verificação é feita diretamente no banco de dados.

    resposta = (
        supabase
        .table("usuarios")
        .select("*")
        .eq("email", usuario.email)
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


# ============================================================
# SALAS
# ============================================================

# ------------------------------------------------------------
# LISTAR SALAS
# ------------------------------------------------------------

@app.get("/salas")
def listar_salas():

    resposta = (
        supabase
        .table("salas")
        .select("*")
        .execute()
    )

    salas = []

    for dados in resposta.data:

        sala = Sala.fromJson(dados)

        salas.append(
            sala.toJson()
        )

    return salas


# ============================================================
# CARRINHOS
# ============================================================

# ------------------------------------------------------------
# LISTAR CARRINHOS
# ------------------------------------------------------------

@app.get("/carrinhos")
def listar_carrinhos():

    resposta = (
        supabase
        .table("carrinhos")
        .select("*")
        .execute()
    )

    carrinhos = []

    for dados in resposta.data:

        carrinho = Carrinho.fromJson(dados)

        carrinhos.append(
            carrinho.toJson()
        )

    return carrinhos


# ============================================================
# RESERVAS
# ============================================================
#
# As reservas são gravadas na tabela "reservas". Toda reserva nasce
# com o status "aguardando" e só muda de status pela rota de
# decisão, que é restrita ao administrador.

# Status possíveis de uma reserva. É a mesma lista usada pelos
# filtros da tela de reservas.
STATUS_AGUARDANDO = "aguardando"
STATUS_APROVADA = "aprovada"
STATUS_NEGADO = "negado"
STATUS_CANCELADA = "cancelada"

DECISOES_RESERVA = (
    STATUS_APROVADA,
    STATUS_NEGADO,
    STATUS_CANCELADA,
)


# ------------------------------------------------------------
# AUXILIARES
# ------------------------------------------------------------

def montar_horario(data: str, hora: str) -> str:
    """Junta data (AAAA-MM-DD) e hora (HH:MM) no formato do banco.

    O formato devolvido é o aceito pela coluna TIMESTAMP. Se os dois
    valores não formarem uma data e hora reais, a rota responde 400
    em vez de gravar uma reserva impossível de ler.
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


def reserva_para_json(dados: dict) -> dict:
    """Converte uma linha da tabela "reservas" no formato das telas.

    O banco guarda a data e a hora juntas em "data_inicio" e
    "data_fim"; as telas esperam "data", "horaEntrada" e "horaSaida"
    separadas. Fazer a conversão aqui evita que cada tela precise
    recortar o timestamp por conta própria.
    """
    inicio = str(dados.get("data_inicio") or "")
    fim = str(dados.get("data_fim") or "")

    return {
        "id": dados.get("id"),
        "data": inicio[:10],
        "horaEntrada": inicio[11:16],
        "horaSaida": fim[11:16],
        "status": dados.get("status") or STATUS_AGUARDANDO,
        "categoria": dados.get("categoria") or "",
        "item": dados.get("item") or "",
        "professor": dados.get("professor") or "",
        "curso": dados.get("curso") or "",
        "motivo": dados.get("motivo") or "",
        "criadoEm": dados.get("criado_em") or "",
        "usuarioId": dados.get("usuario_id")
    }


def usuario_da_sessao(request: Request) -> int:
    """Devolve o id do usuário logado, ou interrompe a rota com 401."""
    usuario_id = request.session.get("usuario_id")

    if not usuario_id:
        raise HTTPException(
            status_code=401,
            detail="Usuário não autenticado"
        )

    return usuario_id


# ------------------------------------------------------------
# LISTAR RESERVAS
# ------------------------------------------------------------

@app.get("/reservas")
def listar_reservas(request: Request):

    usuario_id = usuario_da_sessao(request)

    consulta = (
        supabase
        .table("reservas")
        .select("*")
        .order("data_inicio", desc=True)
    )

    # O professor enxerga apenas os próprios pedidos. O
    # administrador enxerga todos, porque é quem aprova.
    if not eh_coordenador(request):
        consulta = consulta.eq("usuario_id", usuario_id)

    # O filtro de status é opcional, para as abas da tela de reservas.
    status = (request.query_params.get("status") or "").strip().lower()

    if status:
        consulta = consulta.eq("status", status)

    resposta = consulta.execute()

    return [
        reserva_para_json(dados)
        for dados in (resposta.data or [])
    ]


# ------------------------------------------------------------
# CRIAR RESERVA
# ------------------------------------------------------------

@app.post("/reservas", status_code=201)
def criar_reserva(request: Request, reserva: Reserva):

    usuario_id = usuario_da_sessao(request)

    inicio = montar_horario(reserva.data, reserva.horaEntrada)
    fim = montar_horario(reserva.data, reserva.horaSaida)

    if fim <= inicio:
        raise HTTPException(
            status_code=400,
            detail="A hora de saída deve ser depois da entrada"
        )

    dados_reserva = {
        "usuario_id": usuario_id,
        "data_inicio": inicio,
        "data_fim": fim,
        # A reserva entra como pendente: ninguém reserva direto,
        # o administrador responde depois em /reservas/{id}/decisao.
        "status": STATUS_AGUARDANDO,
        "categoria": reserva.categoria,
        "item": reserva.item,
        "professor": reserva.professor,
        "curso": reserva.curso,
        "motivo": reserva.motivo
    }

    resposta = (
        supabase
        .table("reservas")
        .insert(dados_reserva)
        .execute()
    )

    if not resposta.data:
        raise HTTPException(
            status_code=502,
            detail="Não foi possível registrar a reserva"
        )

    return reserva_para_json(resposta.data[0])


# ------------------------------------------------------------
# DECIDIR SOBRE A RESERVA
# ------------------------------------------------------------

@app.patch("/reservas/{reserva_id}/decisao")
def decidir_reserva(
    request: Request,
    reserva_id: int,
    corpo: DecisaoReserva
):

    usuario_id = usuario_da_sessao(request)

    decisao = (corpo.decisao or "").strip().lower()

    if decisao not in DECISOES_RESERVA:
        raise HTTPException(
            status_code=400,
            detail="Decisão inválida"
        )

    # Aprovar e negar são exclusivos do administrador. Cancelar, não:
    # o professor precisa poder desistir do próprio pedido enquanto
    # ele ainda está na mão dele.
    if not eh_coordenador(request):

        if decisao != STATUS_CANCELADA:
            raise HTTPException(
                status_code=403,
                detail="Somente o administrador aprova ou nega uma reserva"
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

        if dono.data[0].get("usuario_id") != usuario_id:
            raise HTTPException(
                status_code=403,
                detail="Esta reserva não é sua"
            )

    resposta = (
        supabase
        .table("reservas")
        .update({
            "status": decisao,
            # A coluna tem valor padrão, mas não é atualizada
            # sozinha: sem isto, a tela de aprovação mostraria
            # sempre a data de criação.
            "atualizado_em": datetime.now().isoformat(
                timespec="seconds"
            )
        })
        .eq("id", reserva_id)
        .execute()
    )

    if not resposta.data:
        raise HTTPException(
            status_code=404,
            detail="Reserva não encontrada"
        )

    return reserva_para_json(resposta.data[0])