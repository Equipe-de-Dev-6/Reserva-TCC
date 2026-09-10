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
app.mount("/css", StaticFiles(directory="static/css"), name="css")
app.mount("/js", StaticFiles(directory="static/js"), name="js")
app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")


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

@app.get("/")
def login():
    return FileResponse("templates/login.html")


@app.get("/home")
def home():
    return FileResponse("templates/paginainicialprofessor.html")


@app.get("/home_admin")
def home():
    return FileResponse("templates/paginainicialadm.html")


@app.get("/cadastro")
def home():
    return FileResponse("templates/cadastro.html")


@app.get("/redefinir_senha")
def home():
    return FileResponse("templates/redefsenha.html")


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

        usuarios.append(usuario.toJson())

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

        salas.append(sala.toJson())

    return salas