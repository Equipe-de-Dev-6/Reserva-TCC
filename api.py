from fastapi import FastAPI, HTTPException

from fastapi.middleware.cors import CORSMiddleware

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
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    # Verifica se já existe um usuário com esse e-mail
    resposta = (
        supabase
        .table("usuarios")
        .select("*")
        .eq("email", usuario.email)
        .execute()
    )

    # Se encontrou algum usuário
    if resposta.data:
        raise HTTPException(
            status_code=400,
            detail="Usuário já cadastrado"
        )

    # Se não existe, cadastra
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

    usuario_cadastrado = Usuario.fromJson(resposta.data[0])

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