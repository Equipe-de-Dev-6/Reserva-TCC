// Configurações da conta do professor.
//
// Este arquivo fala com PUT /usuarios/me, não com PUT /usuarios/{id}:
// a rota com id é exclusiva do coordenador e devolveria 403 aqui.
// O cargo é exibido apenas como informação — quem decide o cargo é o
// coordenador na tela de usuários.

import { usuarioLogado, atualizarMe } from '../api.js';

document.addEventListener('DOMContentLoaded', async () => {

  // ==================================================
  // CARREGAR DADOS DO USUÁRIO LOGADO
  // ==================================================
  let usuarioId = null;

  const campoNome = document.getElementById('nome');
  const campoEmail = document.getElementById('email');

  try {
    const usuario = await usuarioLogado();
    usuarioId = usuario.id;

    if (campoNome && usuario.nome) {
      campoNome.value = usuario.nome;
      campoNome.dataset.original = usuario.nome;
    }

    if (campoEmail && usuario.email) {
      campoEmail.value = usuario.email;
      campoEmail.dataset.original = usuario.email;
    }
  } catch (erro) {
    console.error('Erro ao carregar dados do usuário:', erro);
    alert('Não foi possível carregar os dados do seu perfil.');
  }

  // ==================================================
  // BOTÃO CANCELAR
  // ==================================================

  const btnCancelar = document.getElementById('btnCancelar');

  if (btnCancelar) {
    btnCancelar.addEventListener('click', () => {
      // Volta aos valores originais que o servidor mandou, em vez de
      // deixar os campos em branco.
      if (campoNome) campoNome.value = campoNome.dataset.original || '';
      if (campoEmail) campoEmail.value = campoEmail.dataset.original || '';

      const departamento = document.getElementById('departamento');
      if (departamento) departamento.value = '';
    });
  }

  // ==================================================
  // BOTÃO SALVAR
  // ==================================================

  const btnSalvar = document.getElementById('btnSalvar');

  if (btnSalvar) {
    btnSalvar.addEventListener('click', async () => {
      if (!usuarioId) {
        alert('Usuário não identificado. Faça login novamente.');
        return;
      }

      const dados = {};

      if (campoNome && campoNome.value.trim()) {
        dados.nome = campoNome.value.trim();
      }

      if (campoEmail && campoEmail.value.trim()) {
        dados.email = campoEmail.value.trim();
      }

      if (Object.keys(dados).length === 0) {
        alert('Preencha ao menos um campo para salvar.');
        return;
      }

      btnSalvar.disabled = true;
      btnSalvar.textContent = 'Salvando...';

      try {
        const resposta = await atualizarMe(dados);

        alert('Dados atualizados com sucesso!');

        // Atualiza o valor original para futuros cancelamentos.
        if (campoNome && resposta.nome) {
          campoNome.dataset.original = resposta.nome;
        }
        if (campoEmail && resposta.email) {
          campoEmail.dataset.original = resposta.email;
        }
      } catch (erro) {
        console.error('Erro ao salvar configurações:', erro);
        alert(erro.message || 'Erro ao salvar configurações.');
      } finally {
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar Configurações';
      }
    });
  }
});
