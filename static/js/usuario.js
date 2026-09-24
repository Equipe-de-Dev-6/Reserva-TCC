/**
 * usuario.js
 * Carrega os dados do usuário autenticado no cabeçalho das páginas.
 * A função é exportada para que o carregamento possa ser testado isoladamente.
 */

export async function carregarUsuario() {
  const nomeUsuario = document.getElementById('nomeUsuario');
  const nomePerfil = document.getElementById('nomePerfil');

  try {
    // A rota usa o mesmo cookie de sessão do backend.
    const consulta = await fetch('/usuario_logado');
    const consulta_json = consulta.json();
    const nome = consulta_json.nome || 'Usuario';

    if (nomeUsuario) {
      nomeUsuario.textContent = `Olá ${nome}`;
    }

    if (nomePerfil) {
      nomePerfil.textContent = `Olá ${nome}`;
    }
  } catch (erro) {
    console.error('Erro ao carregar usuário:', erro);
  }
}

// Executa automaticamente quando este módulo é carregado pelo navegador.
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', carregarUsuario, { once: true });
  } else {
    carregarUsuario();
  }
}
