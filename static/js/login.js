
async function entrar(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    try {
        const formData = new FormData();

        formData.append("email", email);
        formData.append("senha", senha);

        const resposta = await fetch("/login", {
            method: "POST",
            body: formData
        });

        const dados = await resposta.json();

        // Verifica se a API retornou algum erro
        if (!resposta.ok || dados.erro) {
            alert(dados.erro || "Erro ao fazer login.");
            return;
        }

        // Redireciona conforme o tipo de usuário
        if (dados.status === "adm") {
            window.location.href = "/home_admin";
        } else if (dados.status === "prof") {
            window.location.href = "/home";
        } else {
            alert("Resposta inesperada do servidor.");
        }

    } catch (erro) {
        console.error("Erro ao fazer login:", erro);
        alert("Não foi possível conectar ao servidor.");
    }
}

// Conecta a função ao formulário
document.addEventListener("DOMContentLoaded", function () {
    const formulario = document.querySelector("form");

    if (formulario) {
        formulario.addEventListener("submit", entrar);
    }
});