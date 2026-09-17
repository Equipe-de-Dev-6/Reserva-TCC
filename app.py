from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from fastapi.responses import RedirectResponse
from consulta import consultar_usuario_por_email_senha
from dotenv import load_dotenv
import os

from db import supabase
from model import (
    Usuario,
    Sala,
    Notebook,
    Carrinho
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


@app.post('/login')
async def login_post(request: Request):
    """Processa login do usuário"""
    dados = await request.form()
    email = dados.get('email')
    senha = dados.get('senha')

    # Busca o usuário com email E senha corretos
    usuarios = consultar_usuario_por_email_senha(email, senha)

    # Se não encontrou o usuário
    if not usuarios:
        return {'erro': 'Email ou senha incorretos'}

    # Usuário encontrado - armazena na sessão
    usuario = usuarios[0]
    request.session["usuario_id"] = usuario["id"]
    request.session["usuario_email"] = usuario["email"]
    request.session["usuario_nome"] = usuario["nome"]
    
    # Verifica se é admin
    if usuario["email"] == 'lthiegue@sp.senai.br':
        return {'status': 'adm'}
    else:
        return {'status': 'prof'}


@app.post("/logout")
async def logout(request: Request):
    # Encerra a sessão do usuário
    request.session.clear()

    # Redireciona para a página inicial
    return RedirectResponse(
        url="/",
        status_code=303
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

@app.get("/avisos")
def ajuda():
    return FileResponse(
        "templates/avisos.html"
    )

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
    return FileResponse("templates/reservar_tela_adm.html")


# ------------------------------------------------------------
# RESERVAS - ADMIN
# ------------------------------------------------------------

@app.get("/reservas_admin")
def reservas_admin(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/reservasadm.html")


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

    usuarios = []

    for dados in resposta.data:

        usuario = Usuario.fromJson(dados)

        usuarios.append(
            usuario.toJson()
        )

    return usuarios


# ------------------------------------------------------------
# CADASTRAR USUÁRIO
# ------------------------------------------------------------

@app.post("/usuarios")
def cadastrar_usuario(usuario: Usuario):

    # Verifica se o email já existe

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


    # Cadastra o usuário

    resposta = (
        supabase
        .table("usuarios")
        .insert(usuario.toJson())
        .execute()
    )

    if not resposta.data:

        raise HTTPException(
            status_code=400,
            detail="Erro ao cadastrar usuário"
        )


    usuario_cadastrado = Usuario.fromJson(
        resposta.data[0]
    )

    return usuario_cadastrado.toJson()


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
# NOTEBOOKS
# ============================================================

# ------------------------------------------------------------
# LISTAR NOTEBOOKS
# ------------------------------------------------------------

@app.get("/notebooks")
def listar_notebooks():

    resposta = (
        supabase
        .table("notebooks")
        .select("*")
        .execute()
    )

    notebooks = []

    for dados in resposta.data:

        notebook = Notebook.fromJson(dados)

        notebooks.append(
            notebook.toJson()
        )

    return notebooks


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