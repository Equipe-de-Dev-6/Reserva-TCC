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
    UsuarioAtualizacao,
    Sala,
    SalaEscrita,
    ReservaEscrita,
    ReservaDecisao,
    STATUS_APROVADA,
    STATUS_NEGADA,
    STATUS_CANCELADA,
    STATUS_RESERVAS,
    hora_para_timestamp,
    data_para_timestamp,
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
# AUXILIARES DE AUTORIZAÇÃO
# ------------------------------------------------------------

# E-mail do administrador. A mesma conta é conferida no login,
# em /login, para escolher a home de cada perfil.
EMAIL_ADMIN = "lthiegue@sp.senai.br"


def exigir_login(request: Request):
    """Devolve o id do usuário logado ou interrompe com 401."""
    usuario_id = request.session.get("usuario_id")

    if not usuario_id:
        raise HTTPException(
            status_code=401,
            detail="Usuário não autenticado"
        )

    return usuario_id


def exigir_admin(request: Request):
    """Garante que quem está chamando é o administrador."""
    exigir_login(request)

    if request.session.get("usuario_email") != EMAIL_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido somente ao administrador"
        )


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


# ------------------------------------------------------------
# LISTAR TODAS AS SALAS (ADMIN)
# ------------------------------------------------------------
# A tela de Gerenciar Salas precisa enxergar também as salas
# que não aparecem nas telas de reserva, porque é justamente
# nelas que o administrador decide o que liberar ou retirar.
#
# O caminho começa com "/admin" para não ser capturado por
# /salas/{sala_id}, que vem antes na lista de rotas e deixaria
# de funcionar se este caminho fosse "/salas/admin".

@app.get("/admin/salas")
def listar_salas_admin(request: Request):
    exigir_admin(request)

    resposta = (
        supabase
        .table("salas")
        .select("*")
        .order("nome")
        .execute()
    )

    return [
        Sala.fromJson(dados).toJson()
        for dados in (resposta.data or [])
    ]


# ------------------------------------------------------------
# CADASTRAR SALA (ADMIN)
# ------------------------------------------------------------

@app.post("/salas")
def cadastrar_sala(sala: SalaEscrita, request: Request):
    exigir_admin(request)

    dados_sala = sala.toJson()

    # Rejeita nomes repetidos porque o banco não tem restrição
    # para isso, e duas salas com o mesmo nome confundem quem
    # tenta reservá-las.
    duplicada = (
        supabase
        .table("salas")
        .select("id")
        .eq("nome", dados_sala["nome"].strip())
        .execute()
    )

    if duplicada.data:

        raise HTTPException(
            status_code=400,
            detail="Já existe uma sala com esse nome"
        )

    resposta = (
        supabase
        .table("salas")
        .insert(dados_sala)
        .execute()
    )

    if not resposta.data:

        raise HTTPException(
            status_code=400,
            detail="Erro ao cadastrar sala"
        )

    return Sala.fromJson(resposta.data[0]).toJson()


# ------------------------------------------------------------
# EDITAR SALA (ADMIN)
# ------------------------------------------------------------

@app.put("/salas/{sala_id}")
def atualizar_sala(sala_id: int, sala: SalaEscrita, request: Request):
    exigir_admin(request)

    atual = (
        supabase
        .table("salas")
        .select("*")
        .eq("id", sala_id)
        .execute()
    )

    if not (atual.data or []):

        raise HTTPException(
            status_code=404,
            detail="Sala não encontrada"
        )

    dados_sala = sala.toJson()

    # A verificação de nome ignora a própria sala, para que
    # editar sem trocar o nome não seja barrado como duplicata.
    duplicada = (
        supabase
        .table("salas")
        .select("id")
        .eq("nome", dados_sala["nome"].strip())
        .neq("id", sala_id)
        .execute()
    )

    if duplicada.data:

        raise HTTPException(
            status_code=400,
            detail="Já existe uma sala com esse nome"
        )

    resposta = (
        supabase
        .table("salas")
        .update(dados_sala)
        .eq("id", sala_id)
        .execute()
    )

    if not resposta.data:

        raise HTTPException(
            status_code=400,
            detail="Erro ao atualizar sala"
        )

    return Sala.fromJson(resposta.data[0]).toJson()


# ------------------------------------------------------------
# EXCLUIR SALA (ADMIN)
# ------------------------------------------------------------

@app.delete("/salas/{sala_id}")
def excluir_sala(sala_id: int, request: Request):
    """Remove a sala do cadastro.

    A exclusão é recusada quando a sala tem reservas
    registradas, para não deixar um agendamento antigo
    apontando para uma sala que não existe mais.
    """

    exigir_admin(request)

    sala = (
        supabase
        .table("salas")
        .select("id")
        .eq("id", sala_id)
        .execute()
    )

    if not (sala.data or []):

        raise HTTPException(
            status_code=404,
            detail="Sala não encontrada"
        )

    reservas = (
        supabase
        .table("reservas")
        .select("id")
        .eq("sala_id", sala_id)
        .execute()
    )

    if reservas.data:

        raise HTTPException(
            status_code=409,
            detail="A sala possui reservas registradas e não pode ser excluída"
        )

    resposta = (
        supabase
        .table("salas")
        .delete()
        .eq("id", sala_id)
        .execute()
    )

    return {
        "id": sala_id,
        "excluida": bool(resposta.data)
    }


# ============================================================
# RESERVAS
# ============================================================
# Fluxo: o professor cria a reserva (POST /reservas) e ela
# nasce com o status "aguardando". O administrador responde em
# PATCH /reservas/{id}/decisao, approving or rejecting it.


# ------------------------------------------------------------
# LISTAR RESERVAS
# ------------------------------------------------------------
# O professor vê apenas as reservas dele. O administrador vê
# todas, e pode filtrar por status.

@app.get("/reservas")
def listar_reservas(request: Request, status: str | None = None):

    usuario_id = exigir_login(request)

    consulta = supabase.table("reservas").select("*")

    if request.session.get("usuario_email") != EMAIL_ADMIN:

        consulta = consulta.eq("usuario_id", usuario_id)

    elif status:

        consulta = consulta.eq("status", status)

    reservas = (
        consulta
        .order("id", desc=True)
        .execute()
    )

    return montar_lista_reservas(reservas.data or [])


# ------------------------------------------------------------
# BUSCAR RESERVA POR ID
# ------------------------------------------------------------

@app.get("/reservas/{reserva_id}")
def buscar_reserva(reserva_id: int, request: Request):

    usuario_id = exigir_login(request)

    resposta = (
        supabase
        .table("reservas")
        .select("*")
        .eq("id", reserva_id)
        .execute()
    )

    reservas = resposta.data or []

    if not reservas:

        raise HTTPException(
            status_code=404,
            detail="Reserva não encontrada"
        )

    reserva = reservas[0]

    # Uma reserva só é visível para quem a criou, exceto para
    # o administrador, que precisa dela para aprovar.
    if (
        request.session.get("usuario_email") != EMAIL_ADMIN
        and reserva.get("usuario_id") != usuario_id
    ):

        raise HTTPException(
            status_code=403,
            detail="Reserva pertence a outro usuário"
        )

    return montar_reserva(reserva)


# ------------------------------------------------------------
# ADICIONAR RESERVA (PROFESSOR)
# ------------------------------------------------------------

@app.post("/reservas")
def criar_reserva(reserva: ReservaEscrita, request: Request):
    """Registra o pedido de reserva feito pelo professor.

    A reserva entra com o status "aguardando". Quem libera é o
    administrador, em PATCH /reservas/{id}/decisao.
    """

    usuario_id = exigir_login(request)

    # A sala precisa existir: sem esta checagem o banco aceitaria
    # uma reserva apontando para uma sala inexistente.
    sala = (
        supabase
        .table("salas")
        .select("id, nome, disponibilidade")
        .eq("id", reserva.sala_id)
        .execute()
    )

    if not (sala.data or []):

        raise HTTPException(
            status_code=404,
            detail="Sala não encontrada"
        )

    if not sala.data[0].get("disponibilidade", True):

        raise HTTPException(
            status_code=400,
            detail="A sala está indisponível para reservas"
        )

    # Converte as datas e os horários do formulário em timestamp.
    # Os dois campos separados (data e hora) viram uma coluna só.
    try:

        data_inicio = data_para_timestamp(
            reserva.data_inicio,
            hora_para_timestamp(reserva.hora_entrada or "08:00")
        )

        data_fim = data_para_timestamp(
            reserva.data_fim,
            hora_para_timestamp(reserva.hora_saida or "18:00")
        )

    except ValueError as erro:

        raise HTTPException(
            status_code=400,
            detail=f"Data ou horário inválido: {erro}"
        )

    if data_fim <= data_inicio:

        raise HTTPException(
            status_code=400,
            detail="O horário de término deve ser depois do início"
        )

    dados = reserva.toJson()

    dados.update({
        "usuario_id": usuario_id,
        "data_inicio": data_inicio.isoformat(),
        "data_fim": data_fim.isoformat(),
        # O nome do professor vem da sessão, e não do corpo do
        # pedido, para que a reserva não fique registrada em nome
        # de outra pessoa.
        "professor": request.session.get("usuario_nome") or dados["professor"],
        "item": dados["item"] or sala.data[0].get("nome"),
        "criado_em": datetime.now().isoformat(),
        "atualizado_em": datetime.now().isoformat(),
    })

    # Duas reservas do mesmo professor não podem ocupar a mesma
    # sala no mesmo horário.
    conflito = (
        supabase
        .table("reservas")
        .select("id")
        .eq("sala_id", reserva.sala_id)
        .eq("usuario_id", usuario_id)
        .neq("status", STATUS_CANCELADA)
        .lt("data_inicio", dados["data_fim"])
        .gt("data_fim", dados["data_inicio"])
        .execute()
    )

    if conflito.data:

        raise HTTPException(
            status_code=409,
            detail="Você já possui uma reserva desta sala neste horário"
        )

    resposta = (
        supabase
        .table("reservas")
        .insert(dados)
        .execute()
    )

    if not resposta.data:

        raise HTTPException(
            status_code=400,
            detail="Erro ao criar reserva"
        )

    return montar_reserva(resposta.data[0])


# ------------------------------------------------------------
# DECIDIR RESERVA (ADMIN)
# ------------------------------------------------------------
# Aprova ou recusa a reserva. O corpo manda apenas o status
# desejado, que precisa ser "aprovada", "negada" ou "cancelada".

@app.patch("/reservas/{reserva_id}/decisao")
def decidir_reserva(
    reserva_id: int,
    decisao: ReservaDecisao,
    request: Request
):

    exigir_admin(request)

    if decisao.status not in STATUS_RESERVAS:

        raise HTTPException(
            status_code=400,
            detail="Status de reserva inválido"
        )

    if decisao.status not in (
        STATUS_APROVADA,
        STATUS_NEGADA,
        STATUS_CANCELADA,
    ):

        raise HTTPException(
            status_code=400,
            detail="A decisão deve ser aprovada, negada ou cancelada"
        )

    atual = (
        supabase
        .table("reservas")
        .select("*")
        .eq("id", reserva_id)
        .execute()
    )

    if not (atual.data or []):

        raise HTTPException(
            status_code=404,
            detail="Reserva não encontrada"
        )

    # Uma reserva já respondida não muda de status outra vez.
    if atual.data[0].get("status") != "aguardando":

        raise HTTPException(
            status_code=409,
            detail="Esta reserva já foi respondida"
        )

    resposta = (
        supabase
        .table("reservas")
        .update({
            "status": decisao.status,
            "atualizado_em": datetime.now().isoformat(),
        })
        .eq("id", reserva_id)
        .execute()
    )

    if not resposta.data:

        raise HTTPException(
            status_code=400,
            detail="Erro ao atualizar a reserva"
        )

    return montar_reserva(resposta.data[0])


# ------------------------------------------------------------
# CANCELAR RESERVA (PROFESSOR)
# ------------------------------------------------------------

@app.delete("/reservas/{reserva_id}")
def cancelar_reserva(reserva_id: int, request: Request):
    """Cancela uma reserva que ainda não foi respondida."""

    usuario_id = exigir_login(request)

    atual = (
        supabase
        .table("reservas")
        .select("*")
        .eq("id", reserva_id)
        .execute()
    )

    if not (atual.data or []):

        raise HTTPException(
            status_code=404,
            detail="Reserva não encontrada"
        )

    reserva = atual.data[0]

    # O professor cancela a própria reserva; o administrador
    # cancela qualquer uma.
    if (
        request.session.get("usuario_email") != EMAIL_ADMIN
        and reserva.get("usuario_id") != usuario_id
    ):

        raise HTTPException(
            status_code=403,
            detail="Reserva pertence a outro usuário"
        )

    # Reserva já recusada não volta para "aguardando": ela
    # seria aprovada sem que ninguém pedisse de novo.
    if reserva.get("status") != "aguardando":

        raise HTTPException(
            status_code=409,
            detail="Somente reservas aguardando podem ser canceladas"
        )

    resposta = (
        supabase
        .table("reservas")
        .update({
            "status": STATUS_CANCELADA,
            "atualizado_em": datetime.now().isoformat(),
        })
        .eq("id", reserva_id)
        .execute()
    )

    if not resposta.data:

        raise HTTPException(
            status_code=400,
            detail="Erro ao cancelar a reserva"
        )

    return montar_reserva(resposta.data[0])


# ------------------------------------------------------------
# MONTAGEM DA RESPOSTA
# ------------------------------------------------------------
# O nome da sala vem junto para o frontend não precisar fazer
# uma segunda requisição só para exibir o título do card.

def montar_reserva(dados: dict):
    """Junta a reserva com o nome da sala para a resposta."""
    reserva = dict(dados)

    sala_id = reserva.get("sala_id")

    if sala_id:

        sala = (
            supabase
            .table("salas")
            .select("nome")
            .eq("id", sala_id)
            .execute()
        )

        if sala.data:

            reserva["sala_nome"] = sala.data[0].get("nome")

    return reserva


def montar_lista_reservas(dados: list):
    """Monta várias reservas resolvendo o nome de cada sala."""
    return [
        montar_reserva(reserva)
        for reserva in dados
    ]


# ============================================================
# PROFESSORES (ADMIN)
# ============================================================

# ------------------------------------------------------------
# ATUALIZAR PROFESSOR (ADMIN)
# ------------------------------------------------------------

@app.put("/usuarios/{usuario_id}")
def atualizar_usuario(
    usuario_id: int,
    usuario: UsuarioAtualizacao,
    request: Request
):
    """Atualiza nome e e-mail de um professor.

    A senha não é alterada aqui: ela fica de fora da resposta e
    da gravação, então o hash guardado no banco permanece.
    """
    exigir_admin(request)

    atual = (
        supabase
        .table("usuarios")
        .select("id")
        .eq("id", usuario_id)
        .execute()
    )

    if not (atual.data or []):

        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado"
        )

    dados_usuario = usuario.toJson()

    # O e-mail identifica o usuário no login, então ele precisa
    # ser único. A verificação ignora o próprio usuário.
    duplicado = (
        supabase
        .table("usuarios")
        .select("id")
        .eq("email", dados_usuario["email"].strip())
        .neq("id", usuario_id)
        .execute()
    )

    if duplicado.data:

        raise HTTPException(
            status_code=400,
            detail="Já existe um usuário com esse e-mail"
        )

    resposta = (
        supabase
        .table("usuarios")
        .update(dados_usuario)
        .eq("id", usuario_id)
        .execute()
    )

    if not resposta.data:

        raise HTTPException(
            status_code=400,
            detail="Erro ao atualizar usuário"
        )

    usuario_atualizado = resposta.data[0]

    # O hash da senha nunca volta para o frontend.
    return {
        "id": usuario_atualizado.get("id"),
        "nome": usuario_atualizado.get("nome"),
        "email": usuario_atualizado.get("email"),
    }


# ------------------------------------------------------------
# EXCLUIR PROFESSOR (ADMIN)
# ------------------------------------------------------------

@app.delete("/usuarios/{usuario_id}")
def excluir_usuario(usuario_id: int, request: Request):
    """Remove um professor do cadastro.

    Usuários com reservas pendentes não podem ser removidos,
    porque o administrador ainda precisa saber de quem é o
    pedido antes de responder.
    """
    exigir_admin(request)

    if request.session.get("usuario_id") == usuario_id:

        raise HTTPException(
            status_code=400,
            detail="Você não pode excluir a própria conta"
        )

    atual = (
        supabase
        .table("usuarios")
        .select("id")
        .eq("id", usuario_id)
        .execute()
    )

    if not (atual.data or []):

        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado"
        )

    pendentes = (
        supabase
        .table("reservas")
        .select("id")
        .eq("usuario_id", usuario_id)
        .eq("status", "aguardando")
        .execute()
    )

    if pendentes.data:

        raise HTTPException(
            status_code=409,
            detail="O professor possui reservas aguardando decisão"
        )

    resposta = (
        supabase
        .table("usuarios")
        .delete()
        .eq("id", usuario_id)
        .execute()
    )

    return {
        "id": usuario_id,
        "excluido": bool(resposta.data)
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