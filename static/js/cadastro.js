
import { cadastrarUsuario, listarUsuarios } from "./api.js";

const formulario = document.getElementById("formUsuario");

console.log("Cadastro.js carregado!");

if (!formulario) {
    console.error("Formulário formUsuario não encontrado!");
} else {
    formulario.addEventListener("submit", cadastrar);
}

async function cadastrar(event) {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const cargo = document.getElementById("cargo").value;
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmar-senha").value;

    // Valida os campos
    if (!nome || !email || !cargo || !senha || !confirmarSenha) {
        alert("Preencha todos os campos!");
        return;
    }

    if (senha.length < 6) {
        alert("A senha precisa ter pelo menos 6 caracteres!");
        return;
    }

    if (senha !== confirmarSenha) {
        alert("As senhas não são iguais!");
        return;
    }

    const dados = {
        nome,
        email,
        cargo,
        senha
    };

    const botao = document.getElementById("btn_cadastro");

    try {
        // Evita múltiplos envios
        botao.disabled = true;
        botao.textContent = "Cadastrando...";

        // Verifica se o e-mail já está cadastrado
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
            console.warn("Não foi possível consultar os usuários:", erro);
        }

        // Envia o cadastro para a API
        await cadastrarUsuario(dados);

        alert("Usuário cadastrado com sucesso!");

        formulario.reset();

        // Retorna para a página de gerenciamento
        window.location.href = "/professores_adm";

    } catch (erro) {
        console.error("Erro no cadastro:", erro);

        alert(erro.message || "Erro ao cadastrar usuário!");

    } finally {
        botao.disabled = false;
        botao.textContent = "Criar Conta";
    }
}
