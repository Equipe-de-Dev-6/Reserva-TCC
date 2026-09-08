from fastapi import FastAPI, HTTPException

from db import supabase

from model import (
    Sala,
    Notebook,
    Carrinho
)


# ============================================================
# CONFIGURAÇÃO DA API
# ============================================================

app = FastAPI(
    title="API Reserva SENAI",
    description="API para gerenciamento de salas, notebooks e carrinhos",
    version="1.0.0"
)


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

    return resposta.data


# ------------------------------------------------------------
# BUSCAR SALA POR ID
# ------------------------------------------------------------

@app.get("/salas/{id}")
def buscar_sala(id: int):

    resposta = (
        supabase
        .table("salas")
        .select("*")
        .eq("id", id)
        .execute()
    )

    if not resposta.data:
        raise HTTPException(
            status_code=404,
            detail="Sala não encontrada"
        )

    return resposta.data[0]


# ------------------------------------------------------------
# CADASTRAR SALA
# ------------------------------------------------------------

@app.post("/salas", status_code=201)
def cadastrar_sala(dados: dict):

    sala = Sala.fromJson(dados)

    resposta = (
        supabase
        .table("salas")
        .insert(sala.toJson())
        .execute()
    )

    return resposta.data[0]


# ------------------------------------------------------------
# ATUALIZAR SALA
# ------------------------------------------------------------

@app.put("/salas/{id}")
def atualizar_sala(id: int, dados: dict):

    sala = Sala.fromJson(dados)

    resposta = (
        supabase
        .table("salas")
        .update(sala.toJson())
        .eq("id", id)
        .execute()
    )

    if not resposta.data:
        raise HTTPException(
            status_code=404,
            detail="Sala não encontrada"
        )

    return resposta.data[0]


# ------------------------------------------------------------
# EXCLUIR SALA
# ------------------------------------------------------------

@app.delete("/salas/{id}")
def excluir_sala(id: int):

    resposta = (
        supabase
        .table("salas")
        .delete()
        .eq("id", id)
        .execute()
    )

    if not resposta.data:
        raise HTTPException(
            status_code=404,
            detail="Sala não encontrada"
        )

    return {
        "mensagem": "Sala excluída com sucesso"
    }


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

    return resposta.data


# ------------------------------------------------------------
# BUSCAR NOTEBOOK POR ID
# ------------------------------------------------------------

@app.get("/notebooks/{id}")
def buscar_notebook(id: int):

    resposta = (
        supabase
        .table("notebooks")
        .select("*")
        .eq("id", id)
        .execute()
    )

    if not resposta.data:
        raise HTTPException(
            status_code=404,
            detail="Notebook não encontrado"
        )

    return resposta.data[0]


# ------------------------------------------------------------
# CADASTRAR NOTEBOOK
# ------------------------------------------------------------

@app.post("/notebooks", status_code=201)
def cadastrar_notebook(dados: dict):

    notebook = Notebook.fromJson(dados)

    resposta = (
        supabase
        .table("notebooks")
        .insert(notebook.toJson())
        .execute()
    )

    return resposta.data[0]


# ------------------------------------------------------------
# ATUALIZAR NOTEBOOK
# ------------------------------------------------------------

@app.put("/notebooks/{id}")
def atualizar_notebook(id: int, dados: dict):

    notebook = Notebook.fromJson(dados)

    resposta = (
        supabase
        .table("notebooks")
        .update(notebook.toJson())
        .eq("id", id)
        .execute()
    )

    if not resposta.data:
        raise HTTPException(
            status_code=404,
            detail="Notebook não encontrado"
        )

    return resposta.data[0]


# ------------------------------------------------------------
# EXCLUIR NOTEBOOK
# ------------------------------------------------------------

@app.delete("/notebooks/{id}")
def excluir_notebook(id: int):

    resposta = (
        supabase
        .table("notebooks")
        .delete()
        .eq("id", id)
        .execute()
    )

    if not resposta.data:
        raise HTTPException(
            status_code=404,
            detail="Notebook não encontrado"
        )

    return {
        "mensagem": "Notebook excluído com sucesso"
    }


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

    return resposta.data


# ------------------------------------------------------------
# BUSCAR CARRINHO POR ID
# ------------------------------------------------------------

@app.get("/carrinhos/{id}")
def buscar_carrinho(id: int):

    resposta = (
        supabase
        .table("carrinhos")
        .select("*")
        .eq("id", id)
        .execute()
    )

    if not resposta.data:
        raise HTTPException(
            status_code=404,
            detail="Carrinho não encontrado"
        )

    return resposta.data[0]


# ------------------------------------------------------------
# CADASTRAR CARRINHO
# ------------------------------------------------------------

@app.post("/carrinhos", status_code=201)
def cadastrar_carrinho(dados: dict):

    carrinho = Carrinho.fromJson(dados)

    resposta = (
        supabase
        .table("carrinhos")
        .insert(carrinho.toJson())
        .execute()
    )

    return resposta.data[0]


# ------------------------------------------------------------
# ATUALIZAR CARRINHO
# ------------------------------------------------------------

@app.put("/carrinhos/{id}")
def atualizar_carrinho(id: int, dados: dict):

    carrinho = Carrinho.fromJson(dados)

    resposta = (
        supabase
        .table("carrinhos")
        .update(carrinho.toJson())
        .eq("id", id)
        .execute()
    )

    if not resposta.data:
        raise HTTPException(
            status_code=404,
            detail="Carrinho não encontrado"
        )

    return resposta.data[0]


# ------------------------------------------------------------
# EXCLUIR CARRINHO
# ------------------------------------------------------------

@app.delete("/carrinhos/{id}")
def excluir_carrinho(id: int):

    resposta = (
        supabase
        .table("carrinhos")
        .delete()
        .eq("id", id)
        .execute()
    )

    if not resposta.data:
        raise HTTPException(
            status_code=404,
            detail="Carrinho não encontrado"
        )

    return {
        "mensagem": "Carrinho excluído com sucesso"
    }

