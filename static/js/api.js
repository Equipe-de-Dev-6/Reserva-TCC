const API_URL = "http://127.0.0.1:8000";

// ============================================================
// USUÁRIOS
// ============================================================

async function listarUsuarios() {

    const resposta = await fetch(`${API_URL}/usuarios`);

    if (!resposta.ok) {
        throw new Error("Erro ao buscar usuários");
    }

    return await resposta.json();
}

// ------------------------------------------------------------
// CADASTRAR USUÁRIO
// ------------------------------------------------------------

async function cadastrarUsuario(dados) {

    const resposta = await fetch(`${API_URL}/usuarios`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
        throw new Error("Erro ao cadastrar usuário");
    }

    return await resposta.json();
}

// ============================================================
// SALAS
// ============================================================

async function listarSalas() {

    const resposta = await fetch(`${API_URL}/salas`);

    if (!resposta.ok) {
        throw new Error("Erro ao buscar salas");
    }

    return await resposta.json();
}


async function buscarSala(id) {

    const resposta = await fetch(`${API_URL}/salas/${id}`);

    if (!resposta.ok) {
        throw new Error("Sala não encontrada");
    }

    return await resposta.json();
}


async function cadastrarSala(dados) {

    const resposta = await fetch(`${API_URL}/salas`, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
        throw new Error("Erro ao cadastrar sala");
    }

    return await resposta.json();
}


async function atualizarSala(id, dados) {

    const resposta = await fetch(`${API_URL}/salas/${id}`, {

        method: "PUT",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
        throw new Error("Erro ao atualizar sala");
    }

    return await resposta.json();
}


async function excluirSala(id) {

    const resposta = await fetch(`${API_URL}/salas/${id}`, {

        method: "DELETE"
    });

    if (!resposta.ok) {
        throw new Error("Erro ao excluir sala");
    }

    return await resposta.json();
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

    listarSalas,
    buscarSala,
    cadastrarSala,
    atualizarSala,
    excluirSala,

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