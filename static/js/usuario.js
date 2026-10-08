/**
 * usuario.js
 * Carrega os dados do usuário autenticado no cabeçalho das páginas.
 * A função é exportada para que o carregamento possa ser testado isoladamente.
 */

export async function carregarUsuario() {
  const nomeUsuario = document.getElementById('nomeUsuario');
  const nomePerfil = document.getElementById('nomePerfil');

  // A rota usa o mesmo cookie de sessão do backend.
  const consulta = await fetch('/usuario_logado');
  const dados = await consulta.json();
  const nome = dados.nome

  if (nomeUsuario) {
    nomeUsuario.textContent = `Olá ${nome}`;
  }

  if (nomePerfil) {
    nomePerfil.textContent = `Olá ${nome}`;
  }
}

carregarUsuario()