from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request
from fastapi.responses import RedirectResponse
from criptografia import hash_password, verify_password
from dotenv import load_dotenv
import os

from db import supabase
from model import (
    Usuario,
    Sala,
    Notebook,
    Carrinho
)
from consulta_salas import consultar_salas_reservaveis


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
# ROTAS DE PÁGINA
# ============================================================
# Entregam um template HTML para o navegador. Quando a página faz
# parte de uma área logada, a rota verifica a sessão e redireciona
# para o login quando o usuário não está autenticado.


# ------------------------------------------------------------
# AUTENTICAÇÃO
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

    # Busca o usuário no Supabase apenas pelo e-mail. A senha não participa
    # da consulta porque ela é salva no banco como hash bcrypt.
    resposta = (
        supabase
        .table("usuarios")
        .select("*")
        .eq("email", email)
        .execute()
    )

    usuarios = resposta.data or []

    # Retorna uma mensagem específica quando o e-mail não está cadastrado.
    if not usuarios:
        return {'erro': 'E-mail não encontrado'}

    usuario = usuarios[0]

    # O bcrypt compara a senha enviada com o hash armazenado. A senha em
    # texto plano nunca é comparada diretamente nem retornada pela API.
    if not verify_password(senha, usuario.get("senha", "")):
        return {'erro': 'Email ou senha incorretos'}

    # Usuário autenticado - armazena somente os dados necessários na sessão.
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
# PÁGINAS PÚBLICAS
# ------------------------------------------------------------
# Acesso liberado: cadastro e recuperação de senha.

@app.get("/cadastro")
def cadastro():
    return FileResponse("templates/cadastro.html")


@app.get("/redefinir_senha")
def redefinir_senha():
    return FileResponse("templates/redefsenha.html")


@app.get("/esqueceu_senha")
def esqueceu_senha():
    return FileResponse("templates/esqueceu_senha.html")


# ------------------------------------------------------------
# PÁGINAS DO PROFESSOR
# ------------------------------------------------------------

@app.get("/home")
def home_professor(request: Request):  # ✅ Precisa ter request
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/paginainicialprofessor.html")


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


@app.get("/calendario_prof")
def calendario_prof(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/calendarioprof.html")


@app.get("/notificacoes_prof")
def notificacoes_prof(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/notificacoesprof.html")


@app.get("/escolher_reserva_salas")
def escolher_reserva_salas(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/escolherreservaprof.html")


@app.get("/escolher_reserva_laboratorios")
def escolher_reserva_laboratorios(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/escolherreservaprof2.html")


@app.get("/escolher_reserva_gabinetes")
def escolher_reserva_gabinetes(request: Request):
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/escolherreservaprof3.html")


@app.get('/reservas_prof')
def reservas_prof(request: Request):
    if 'usuario_id' not in request.session:
        return RedirectResponse(url='/', status_code=302)
    return FileResponse('templates/reservasprof.html')


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


# ------------------------------------------------------------
# PÁGINAS DO ADMIN
# ------------------------------------------------------------

@app.get("/home_admin")
def home_admin(request: Request):
    """Home do admin - protegida por sessão"""
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/paginainicialadm.html")


@app.get("/aprovar_reservas_adm")
def aprovar_reservas_adm(request: Request):
    """Tela do admin para aprovar ou recusar as reservas dos professores"""
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/aprovar_reservas_adm.html")


@app.get("/professores_adm")
def professores_adm(request: Request):
    """Tela do admin para gerenciar os professores cadastrados"""
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/professores_adm.html")


@app.get("/gerenciar_salas_adm")
def gerenciar_salas_adm(request: Request):
    """Tela do admin para gerenciar as salas do campus"""
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/gerenciar_salas_adm.html")


@app.get("/configuracoes_adm")
def configuracoes_adm(request: Request):
    """Configurações da conta do administrador"""
    if "usuario_id" not in request.session:
        return RedirectResponse(url="/", status_code=302)
    return FileResponse("templates/configuracoes_adm.html")


# ------------------------------------------------------------
# FLUXO DE RESERVA - PASSO 2 (ESCOLHER ITENS)
# ------------------------------------------------------------

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


# ------------------------------------------------------------
# FLUXO DE RESERVA - PASSO 3 (CONFIRMAÇÃO)
# ------------------------------------------------------------

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
# ROTAS DE CONTEXTO
# ============================================================
# Não entregam HTML. Retornam dados em JSON para o frontend
# consumir via fetch.


# ------------------------------------------------------------
# SESSÃO
# ------------------------------------------------------------

@app.get("/usuario-logado")
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


    # Nunca retorna a senha nem o hash para o cliente.
    usuario_cadastrado = resposta.data[0]
    return {
        "id": usuario_cadastrado.get("id"),
        "nome": usuario_cadastrado.get("nome"),
        "email": usuario_cadastrado.get("email"),
    }


# ============================================================
# SALAS
# ============================================================

# ------------------------------------------------------------
# LISTAR SALAS
# ------------------------------------------------------------

@app.get("/salas")
def listar_salas():
    """Lista as salas reserváveis, já com o contexto montado

    O filtro das salas que aparecem nas telas de reserva é feito
    na consulta ao banco, então o frontend recebe apenas elas.
    """

    salas = []

    for dados in consultar_salas_reservaveis():

        sala = Sala.fromJson(dados)

        salas.append(
            sala.toJson()
        )

    return salas


# ------------------------------------------------------------
# BUSCAR SALA POR ID
# ------------------------------------------------------------

@app.get("/salas/{sala_id}")
def buscar_sala(sala_id: int):
    """Retorna somente o json de uma sala, já com o contexto montado"""

    resposta = (
        supabase
        .table("salas")
        .select("*")
        .eq("id", sala_id)
        .execute()
    )

    salas = resposta.data or []

    if not salas:

        raise HTTPException(
            status_code=404,
            detail="Sala não encontrada"
        )

    return Sala.fromJson(salas[0]).toJson()


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