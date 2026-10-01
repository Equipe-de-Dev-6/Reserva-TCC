/**
 * Endereço da API.
 *
 * A URL é relativa de propósito. Se fosse absoluta
 * ("http://127.0.0.1:8000"), o navegador trataria a chamada como
 * de outra origem ao abrir o site em "localhost" ou em outra
 * porta, e o cookie de sessão não seria enviado: as rotas que
 * exigem login responderiam 401 mesmo com o usuário logado.
 * Usando o caminho, a chamada sempre sai para o mesmo servidor
 * que entregou a página.
 */
const API_URL = "";

/**
 * Lê a mensagem de erro enviada pela API.
 *
 * A API responde com {"detail": "..."} nos erros do FastAPI.
 * Quando a resposta não traz esse campo, devolve null para o
 * chamador exibir uma mensagem genérica.
 */
async function lerErro(resposta) {

    try {

        const corpo = await resposta.json();

        return corpo && corpo.detail ? corpo.detail : null;

    } catch (e) {

        return null;

    }

}

/**
 * Executa a requisição e devolve o json.
 *
 * Concentrar o tratamento de erro em um único lugar evita
 * repetir o mesmo bloco em todas as funções do arquivo. A
 * mensagem da API chega intacta em "erro.mensagem", para a
 * tela poder mostrar o motivo real (sala indisponível,
 * reserva duplicada, e-mail já cadastrado, e assim por diante).
 */
async function requisitar(caminho, opcoes = {}) {

    const resposta = await fetch(`${API_URL}${caminho}`, {

        method: opcoes.method || "GET",

        headers: opcoes.corpo !== undefined
            ? { "Content-Type": "application/json" }
            : undefined,

        // O cookie de sessão viaja junto nas chamadas de escrita,
        // porque é ele que diz à API quem está logado.
        credentials: "same-origin",

        body: opcoes.corpo !== undefined
            ? JSON.stringify(opcoes.corpo)
            : undefined
    });

    if (resposta.status === 401) {

        window.location.href = "/";

        throw new Error("Sessão expirada");

    }

    if (!resposta.ok) {

        throw new Error(
            (await lerErro(resposta)) || "Não foi possível concluir a operação"
        );

    }

    // O DELETE de salas e de usuários responde 200 com corpo,
    // mas o cancelamento de reserva pode responder sem corpo.
    if (resposta.status === 204) {

        return null;

    }

    return await resposta.json();

}


// ============================================================
// USUÁRIOS
// ============================================================

async function listarUsuarios() {

    return await requisitar("/usuarios");

}

async function cadastrarUsuario(dados) {

    return await requisitar("/usuarios", {
        method: "POST",
        corpo: dados
    });

}

async function atualizarUsuario(id, dados) {

    return await requisitar(`/usuarios/${id}`, {
        method: "PUT",
        corpo: dados
    });

}

async function excluirUsuario(id) {

    return await requisitar(`/usuarios/${id}`, {
        method: "DELETE"
    });

}

// ============================================================
// SALAS
// ============================================================

async function listarSalas() {

    return await requisitar("/salas");

}


async function buscarSala(id) {

    return await requisitar(`/salas/${id}`);

}


/**
 * Lista todas as salas, incluindo as que não aparecem nas
 * telas de reserva. É a rota usada pela tela de Gerenciar
 * Salas do administrador.
 */
async function listarSalasAdmin() {

    return await requisitar("/admin/salas");

}


async function cadastrarSala(dados) {

    return await requisitar("/salas", {
        method: "POST",
        corpo: dados
    });

}


async function atualizarSala(id, dados) {

    return await requisitar(`/salas/${id}`, {
        method: "PUT",
        corpo: dados
    });

}


async function excluirSala(id) {

    return await requisitar(`/salas/${id}`, {
        method: "DELETE"
    });

}


// ============================================================
// RESERVAS
// ============================================================

async function listarReservas(status) {

    const caminho = status
        ? `/reservas?status=${encodeURIComponent(status)}`
        : "/reservas";

    return await requisitar(caminho);

}


async function buscarReserva(id) {

    return await requisitar(`/reservas/${id}`);

}


/**
 * Envia o pedido de reserva. A reserva entra como
 * "aguardando" e quem aprova é o administrador.
 */
async function criarReserva(dados) {

    return await requisitar("/reservas", {
        method: "POST",
        corpo: dados
    });

}


/**
 * Aprova, nega ou cancela uma reserva. Só o administrador
 * usa esta função.
 */
async function decidirReserva(id, status) {

    return await requisitar(`/reservas/${id}/decisao`, {
        method: "PATCH",
        corpo: { status }
    });

}


/**
 * Cancela uma reserva que ainda não foi respondida.
 */
async function cancelarReserva(id) {

    return await requisitar(`/reservas/${id}`, {
        method: "DELETE"
    });

}


// ============================================================
// NOTEBOOKS
// ============================================================

async function listarNotebooks() {

    const resposta = await fetch(`${API_URL}/notebooks`);

    if (!resposta.ok) {
        throw new Error("Erro ao buscar notebooks");
    }

    return await resposta.json();
}


async function buscarNotebook(id) {

    const resposta = await fetch(`${API_URL}/notebooks/${id}`);

    if (!resposta.ok) {
        throw new Error("Notebook não encontrado");
    }

    return await resposta.json();
}


async function cadastrarNotebook(dados) {

    const resposta = await fetch(`${API_URL}/notebooks`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
        throw new Error("Erro ao cadastrar notebook");
    }

    return await resposta.json();
}


async function atualizarNotebook(id, dados) {

    const resposta = await fetch(`${API_URL}/notebooks/${id}`, {

        method: "PUT",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
        throw new Error("Erro ao atualizar notebook");
    }

    return await resposta.json();
}


async function excluirNotebook(id) {

    const resposta = await fetch(`${API_URL}/notebooks/${id}`, {

        method: "DELETE"
    });

    if (!resposta.ok) {
        throw new Error("Erro ao excluir notebook");
    }

    return await resposta.json();
}


// ============================================================
// CARRINHOS
// ============================================================

async function listarCarrinhos() {

    const resposta = await fetch(`${API_URL}/carrinhos`);

    if (!resposta.ok) {
        throw new Error("Erro ao buscar carrinhos");
    }

    return await resposta.json();
}


async function buscarCarrinho(id) {

    const resposta = await fetch(`${API_URL}/carrinhos/${id}`);

    if (!resposta.ok) {
        throw new Error("Carrinho não encontrado");
    }

    return await resposta.json();
}


async function cadastrarCarrinho(dados) {

    const resposta = await fetch(`${API_URL}/carrinhos`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
        throw new Error("Erro ao cadastrar carrinho");
    }

    return await resposta.json();
}


async function atualizarCarrinho(id, dados) {

    const resposta = await fetch(`${API_URL}/carrinhos/${id}`, {

        method: "PUT",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
        throw new Error("Erro ao atualizar carrinho");
    }

    return await resposta.json();
}


async function excluirCarrinho(id) {

    const resposta = await fetch(`${API_URL}/carrinhos/${id}`, {

        method: "DELETE"
    });

    if (!resposta.ok) {
        throw new Error("Erro ao excluir carrinho");
    }

    return await resposta.json();
}




// ============================================================
// EXPORTAÇÕES
// ============================================================

export {

    listarUsuarios,
    cadastrarUsuario,
    atualizarUsuario,
    excluirUsuario,

    listarSalas,
    buscarSala,
    listarSalasAdmin,
    cadastrarSala,
    atualizarSala,
    excluirSala,

    listarReservas,
    buscarReserva,
    criarReserva,
    decidirReserva,
    cancelarReserva,

    listarNotebooks,
    buscarNotebook,
    cadastrarNotebook,
    atualizarNotebook,
    excluirNotebook,

    listarCarrinhos,
    buscarCarrinho,
    cadastrarCarrinho,
    atualizarCarrinho,
    excluirCarrinho

};