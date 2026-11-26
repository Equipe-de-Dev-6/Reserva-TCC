"""Serviço de notificações.

Centraliza a criação de notificações relacionadas a reservas, alterações e
cancelamentos. As rotas (app.py) apenas decidem *quando* notificar; a
montagem do texto, a consulta aos destinatários e a gravação no banco
ficam aqui, para não duplicar regra de negócio entre endpoints.
"""

from db import supabase


# Limites acompanhando a validação da rota pública de notificações.
TITULO_MAX = 200
MENSAGEM_MAX = 1000


def _truncar(texto, limite):
    return str(texto or "")[:limite]


def _coordenadores(excluir_id=None):
    """Devolve os ids dos usuários com cargo Coordenador."""
    try:
        resposta = (
            supabase
            .table("usuarios")
            .select("id")
            .eq("cargo", "Coordenador")
            .execute()
        )
    except Exception:  # noqa: BLE001
        return []

    ids = []
    for linha in (resposta.data or []):
        uid = linha.get("id")
        if uid is None:
            continue
        if excluir_id is not None and uid == excluir_id:
            continue
        ids.append(uid)
    return ids


def criar(usuario_id, titulo, mensagem):
    """Grava uma notificação para o usuário informado.

    É um efeito colateral: falhas no banco não derrubam a operação
    principal (reserva, decisão, cancelamento).
    """
    if usuario_id is None:
        return None

    try:
        resposta = (
            supabase
            .table("notificacoes")
            .insert({
                "usuario_id": usuario_id,
                "titulo": _truncar(titulo, TITULO_MAX),
                "mensagem": _truncar(mensagem, MENSAGEM_MAX),
            })
            .execute()
        )
    except Exception:  # noqa: BLE001
        return None

    if not resposta.data:
        return None
    return resposta.data[0]


def notificar_nova_reserva(reserva, solicitante_id):
    """Avisa os coordenadores de que há uma nova solicitação de reserva."""
    item = reserva.get("item") or "recurso"
    data_txt = reserva.get("data") or ""
    hora_txt = reserva.get("horaEntrada") or ""
    professor = reserva.get("professor") or "Professor"

    mensagem = (
        f"{professor} solicitou reserva de {item} "
        f"em {data_txt} às {hora_txt}."
    )

    for coord_id in _coordenadores(excluir_id=solicitante_id):
        criar(coord_id, "Nova solicitação de reserva", mensagem)


def notificar_decisao(reserva, decisao):
    """Avisa o professor dono da reserva sobre a decisão do coordenador."""
    professor_id = reserva.get("usuario_id")
    if professor_id is None:
        return

    item = reserva.get("item") or "recurso"
    inicio = str(reserva.get("data_inicio") or "")
    data_txt = inicio[:10] or reserva.get("data") or ""
    hora_txt = inicio[11:16] or reserva.get("horaEntrada") or ""

    if decisao == "aprovada":
        titulo = "Reserva aprovada"
        verbo = "aprovada"
    elif decisao == "negada":
        titulo = "Reserva recusada"
        verbo = "recusada"
    elif decisao == "cancelada":
        titulo = "Reserva cancelada"
        verbo = "cancelada"
    else:
        return

    criar(
        professor_id,
        titulo,
        f"Sua reserva de {item} em {data_txt} às {hora_txt} foi {verbo}.",
    )


def notificar_cancelamento_pelo_professor(reserva):
    """Avisa os coordenadores de que um professor cancelou a reserva."""
    item = reserva.get("item") or "recurso"
    inicio = str(reserva.get("data_inicio") or "")
    data_txt = inicio[:10] or reserva.get("data") or ""
    hora_txt = inicio[11:16] or reserva.get("horaEntrada") or ""
    professor = reserva.get("professor") or "Professor"

    mensagem = (
        f"{professor} cancelou a reserva de {item} "
        f"em {data_txt} às {hora_txt}."
    )

    for coord_id in _coordenadores():
        criar(coord_id, "Reserva cancelada", mensagem)