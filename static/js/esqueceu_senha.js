import { solicitarAlteracaoSenha } from "./api.js";

const formulario = document.getElementById("form-esqueceu-senha");
const aviso = document.getElementById("aviso");
const botao = document.getElementById("btn-solicitar");

function mostrarAviso(mensagem, tipo) {
    aviso.textContent = mensagem || "";
    aviso.className = tipo ? `aviso ${tipo}` : "aviso";
}

async function solicitar(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmar-senha").value;

    // O backend confere de novo: a checagem aqui serve para responder
    // sem ida ao servidor, e não para substituir a validação dele.
    if (senha.length < 6) {
        mostrarAviso("A nova senha deve ter pelo menos 6 caracteres.", "erro");
        return;
    }

    if (senha !== confirmarSenha) {
        mostrarAviso("As senhas não coincidem.", "erro");
        return;
    }

    botao.disabled = true;
    mostrarAviso("");

    try {
        const dados = await solicitarAlteracaoSenha(email, senha);

        // O status "pendente" é o que confirma que a solicitação foi
        // registrada. Qualquer outro valor é tratado como falha, mesmo
        // que a requisição tenha voltado com sucesso.
        if (dados.status !== "pendente") {
            mostrarAviso(
                dados.mensagem || "Não foi possível registrar a solicitação.",
                "erro"
            );
            return;
        }

        formulario.reset();
        mostrarAviso(
            dados.mensagem || "Solicitação enviada. Aguarde a aprovação de um coordenador.",
            "sucesso"
        );
    } catch (erro) {
        mostrarAviso(
            erro.message || "Não foi possível enviar a solicitação.",
            "erro"
        );
    } finally {
        botao.disabled = false;
    }
}

formulario.addEventListener("submit", solicitar);
