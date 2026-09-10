import { listarUsuarios } from "./api.js";


const formulario = document.querySelector("form");


async function entrar(event) {

    event.preventDefault();


    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;


    try {

        // Busca os usuários no banco
        const usuarios = await listarUsuarios();


        // Procura o usuário
        const usuario = usuarios.find(
            usuario =>
                usuario.email === email &&
                usuario.senha === senha
        );


        // Usuário não encontrado
        if (!usuario) {

            alert("Email ou senha incorretos!");

            return;
        }


        // Login realizado
        alert("Login realizado com sucesso!");

        if (email === 'lthiegue@sp.senai.br') {
            window.location.href = 'http://127.0.0.1:8000/home_admin'
        }
        else {
            window.location.href = "http://127.0.0.1:8000/home";
        }


    } catch (erro) {

        console.log(erro);

        alert("Erro ao realizar login!");
    }
}


formulario.addEventListener("submit", entrar);