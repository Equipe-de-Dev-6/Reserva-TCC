import { cadastrarUsuario, listarUsuarios } from "./api.js";

const formulario = document.querySelector("form");

async function cadastrar(event) {

    // Impede o formulário de recarregar a página
    event.preventDefault();

    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmar-senha").value;

    // Verifica se as senhas são iguais
    if (senha !== confirmarSenha) {
        alert("As senhas não são iguais!");
        return;
    }

    const dados = {
        nome: nome,
        email: email,
        senha: senha
    };

    try {

        // Lista os usuários cadastrados
        const usuarios = await listarUsuarios();

        // Verifica se o email já existe
        const usuarioExistente = usuarios.find(
            usuario => usuario.email === email
        );

        if (usuarioExistente) {
            alert("Usuário já cadastrado!");
            return;
        }

        // Cadastra o usuário
        const usuario = await cadastrarUsuario(dados);

        console.log("Usuário cadastrado:", usuario);

        alert("Usuário cadastrado com sucesso!");

    } catch (erro) {

        console.log(erro);
        alert("Erro ao cadastrar usuário!");

    }
}

// Evento de envio do formulário
formulario.addEventListener("submit", cadastrar);