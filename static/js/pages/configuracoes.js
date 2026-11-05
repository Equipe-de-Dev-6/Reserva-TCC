import { usuarioLogado, atualizarUsuario } from '../api.js';

document.addEventListener("DOMContentLoaded", async () => {

  // ==================================================
  // CARREGAR DADOS DO USUÁRIO LOGADO
  // ==================================================
  let usuarioId = null;

  try {
    const usuario = await usuarioLogado();
    usuarioId = usuario.id;

    const campoNome = document.getElementById("nome");
    const campoCargo = document.getElementById("cargo");
    const campoEmail = document.getElementById("email");

    if (campoNome && usuario.nome) {
      campoNome.value = usuario.nome;
      campoNome.dataset.original = usuario.nome;
    }

    if (campoCargo && usuario.cargo) {
      campoCargo.value = usuario.cargo;
    }

    if (campoEmail && usuario.email) {
      campoEmail.value = usuario.email;
    }

  } catch (erro) {
    console.error("Erro ao carregar dados do usuário:", erro);
    alert("Não foi possível carregar os dados do seu perfil.");
  }

  // ==================================================
  // DROPDOWN DO USUÁRIO
  // ==================================================

  // ==================================================
  // MENU MOBILE
  // ==================================================

  // ==================================================
  // BOTÃO CANCELAR
  // ==================================================

  const btnCancelar =
      document.getElementById("btnCancelar");

  if (btnCancelar) {

    btnCancelar.addEventListener("click", () => {

      // Volta o nome ao valor original, que veio pronto
      // do servidor em "data-original".
      const campoNome = document.getElementById("nome");

      if (campoNome) {
        campoNome.value =
          campoNome.dataset.original || "";
      }

      document.getElementById("cargo").value = "";
      document.getElementById("email").value = "";
      document.getElementById("departamento").value = "";

    });

  }

  // ==================================================
  // BOTÃO SALVAR
  // ==================================================

  const btnSalvar =
      document.getElementById("btnSalvar");

  if (btnSalvar) {

    btnSalvar.addEventListener("click", async () => {

      if (!usuarioId) {
        alert("Usuário não identificado. Faça login novamente.");
        return;
      }

      const campoNome = document.getElementById("nome");
      const campoCargo = document.getElementById("cargo");
      const campoEmail = document.getElementById("email");

      const dados = {};

      if (campoNome && campoNome.value.trim()) {
        dados.nome = campoNome.value.trim();
      }

      if (campoCargo && campoCargo.value.trim()) {
        dados.cargo = campoCargo.value.trim();
      }

      if (campoEmail && campoEmail.value.trim()) {
        dados.email = campoEmail.value.trim();
      }

      if (Object.keys(dados).length === 0) {
        alert("Preencha ao menos um campo para salvar.");
        return;
      }

      btnSalvar.disabled = true;
      btnSalvar.textContent = "Salvando...";

      try {
        const resposta = await atualizarUsuario(usuarioId, dados);

        alert("Dados atualizados com sucesso!");

        // Atualiza o valor original para futuros cancelamentos.
        if (campoNome && resposta.nome) {
          campoNome.dataset.original = resposta.nome;
        }

      } catch (erro) {
        console.error("Erro ao salvar configurações:", erro);
        alert(erro.message || "Erro ao salvar configurações.");
      } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = "Salvar Configurações";
      }

    });

  }

});
