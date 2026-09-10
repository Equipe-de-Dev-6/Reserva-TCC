from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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

# A pasta física continua sendo "static",
# mas a URL não possui "/static".

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
# PÁGINAS
# ============================================================

# ------------------------------------------------------------
# LOGIN
# ------------------------------------------------------------

@app.get("/")
def login():
    return FileResponse(
        "templates/login.html"
    )


# ------------------------------------------------------------
# INÍCIO PROFESSOR
# ------------------------------------------------------------

@app.get("/home")
def home_professor():
    return FileResponse(
        "templates/paginainicialprofessor.html"
    )


# ------------------------------------------------------------
# INÍCIO ADMIN
# ------------------------------------------------------------

@app.get("/home_admin")
def home_admin():
    return FileResponse(
        "templates/paginainicialadm.html"
    )


# ------------------------------------------------------------
# CADASTRO
# ------------------------------------------------------------

@app.get("/cadastro")
def cadastro():
    return FileResponse(
        "templates/cadastro.html"
    )


# ------------------------------------------------------------
# REDEFINIR SENHA
# ------------------------------------------------------------

@app.get("/redefinir_senha")
def redefinir_senha():
    return FileResponse(
        "templates/redefsenha.html"
    )


# ------------------------------------------------------------
# ESQUECEU SENHA
# ------------------------------------------------------------

@app.get("/esqueceu_senha")
def esqueceu_senha():
    return FileResponse(
        "templates/esqueceu_senha.html"
    )


# ============================================================
# PÁGINAS DO PROFESSOR
# ============================================================

# ------------------------------------------------------------
# RESERVAR
# ------------------------------------------------------------

@app.get("/reservar")
def reservar():
    return FileResponse(
        "templates/reservar_tela_prof.html"
    )


# ------------------------------------------------------------
# RESERVAS
# ------------------------------------------------------------

@app.get("/reservas_prof")
def reservas_prof():
    return FileResponse(
        "templates/reservasprof.html"
    )


# ------------------------------------------------------------
# CALENDÁRIO
# ------------------------------------------------------------

@app.get("/calendario_prof")
def calendario_prof():
    return FileResponse(
        "templates/calendarioprof.html"
    )


# ------------------------------------------------------------
# NOTIFICAÇÕES
# ------------------------------------------------------------

@app.get("/notificacoes_prof")
def notificacoes_prof():
    return FileResponse(
        "templates/notificacoesprof.html"
    )


# ------------------------------------------------------------
# ESCOLHER RESERVA - SALAS
# ------------------------------------------------------------

@app.get("/escolher_reserva_salas")
def escolher_reserva_salas():
    return FileResponse(
        "templates/escolherreservaprof.html"
    )


# ------------------------------------------------------------
# ESCOLHER RESERVA - LABORATÓRIOS
# ------------------------------------------------------------

@app.get("/escolher_reserva_laboratorios")
def escolher_reserva_laboratorios():
    return FileResponse(
        "templates/escolherreservaprof2.html"
    )


# ------------------------------------------------------------
# ESCOLHER RESERVA - GABINETES
# ------------------------------------------------------------

@app.get("/escolher_reserva_gabinetes")
def escolher_reserva_gabinetes():
    return FileResponse(
        "templates/escolherreservaprof3.html"
    )


# ============================================================
# PÁGINAS DO ADMIN
# ============================================================

# ------------------------------------------------------------
# RESERVAR - ADMIN
# ------------------------------------------------------------

@app.get("/reservar_admin")
def reservar_admin():
    return FileResponse(
        "templates/reservar_tela_adm.html"
    )


# ------------------------------------------------------------
# RESERVAS - ADMIN
# ------------------------------------------------------------

@app.get("/reservas_admin")
def reservas_admin():
    return FileResponse(
        "templates/reservasadm.html"
    )

@app.get("/passo2_reserva_prof")
def passo02_reserva_prof():
    return FileResponse("templates/passo02reservaprof.html")




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