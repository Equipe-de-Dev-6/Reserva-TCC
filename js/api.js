const API_URL = "http://127.0.0.1:8000";


// ============================================================
// SALAS
// ============================================================

// Buscar todas as salas
async function listarSalas() {

    const resposta = await fetch(`${API_URL}/salas`);

    if (!resposta.ok) {
        throw new Error("Erro ao buscar salas");
    }

    return await resposta.json();
}


// Buscar sala por ID
async function buscarSala(id) {

    const resposta = await fetch(`${API_URL}/salas/${id}`);

    if (!resposta.ok) {
        throw new Error("Sala não encontrada");
    }

    return await resposta.json();
}


// Cadastrar sala
async function cadastrarSala(sala) {

    const resposta = await fetch(`${API_URL}/salas`, {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(sala)
    });

    if (!resposta.ok) {
        throw new Error("Erro ao cadastrar sala");
    }

    return await resposta.json();
}


// Atualizar sala
async function atualizarSala(id, sala) {

    const resposta = await fetch(`${API_URL}/salas/${id}`, {
        method: "PUT",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(sala)
    });

    if (!resposta.ok) {
        throw new Error("Erro ao atualizar sala");
    }

    return await resposta.json();
}


// Excluir sala
async function excluirSala(id) {

    const resposta = await fetch(`${API_URL}/salas/${id}`, {
        method: "DELETE"
    });

    if (!resposta.ok) {
        throw new Error("Erro ao excluir sala");
    }

    return await resposta.json();
}