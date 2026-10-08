import { cadastrarUsuario, listarUsuarios } from "./api.js";

const formulario = document.querySelector("form");

async function cadastrar(event) {

    // Impede o formulário de recarregar a página
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const cargo = document.getElementById("cargo").value;
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmar-senha").value;

    // Verifica se o cargo foi selecionado
    if (!cargo) {
        alert("Selecione o cargo!");
        return;
    }

    // Verifica se as senhas são iguais
    if (senha !== confirmarSenha) {
        alert("As senhas não são iguais!");
        return;
    }

    const dados = {
        nome: nome,
        email: email,
        cargo: cargo,
        senha: senha
    };

    try {

        // A conferência de e-mail repetido é só para dar um retorno
        // mais rápido na tela. A garantia real está no servidor, que
        // recusa o segundo cadastro com o mesmo e-mail — e a mensagem
        // que chega aqui já é a que a API devolveu.
        try {

            const usuarios = await listarUsuarios();

            const usuarioExistente = usuarios.find(
                usuario => usuario.email.toLowerCase() === email
            );

            if (usuarioExistente) {
                alert("Usuário já cadastrado!");
                return;
            }

        } catch (erro) {

            // Sem a lista (o endpoint exige perfil de Coordenador),
            // o cadastro segue e o servidor é quem decide.

        }

        await cadastrarUsuario(dados);

        alert("Usuário cadastrado com sucesso!");

    } catch (erro) {

        // A API explica o motivo: "Usuário já cadastrado", "E-mail ou
        // senha inválidos" e afins. Preferir essa mensagem a um texto
        // genérico é o que faz a tela ser útil.
        alert(erro.message || "Erro ao cadastrar usuário!");

    }
}

// Evento de envio do formulário
formulario.addEventListener("submit", cadastrar);