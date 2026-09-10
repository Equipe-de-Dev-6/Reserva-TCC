import { listarUsuarios } from "./api.js";

const formulario = document.querySelector("form");

async function entrar(event) {

    event.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    try {

        const usuarios = await listarUsuarios();

        const usuario = usuarios.find(
            usuario =>
                usuario.email === email &&
                usuario.senha === senha
        );

        if (!usuario) {
            alert("Email ou senha incorretos!");
            return;
        }

        alert("Login realizado com sucesso!");

        window.location.href = "index.html";

    } catch (erro) {

        console.log(erro);
        alert("Erro ao realizar login!");

    }
}

formulario.addEventListener("submit", entrar);