// ============================================================
// notificacoesprof.js
// Lista as notificações do usuário da sessão lidas da API.
// ============================================================
//
// Antes esta tela lia o cache local de reservas.js, que não sabia das
// notificações gravadas no banco pelo coordenador. Agora a fonte é
// GET /api/notificacoes; marcar como lida e excluir também passam pela
// API, que filtra pelo usuario_id da sessão.
//
// Dados vindos do banco entram no HTML com escapeHtml(): textContent
// seria ainda melhor, mas a lista é redesenhada por completo a cada
// atualização e o padrão da tela já usa innerHTML.

import {
  listarNotificacoes,
  marcarNotificacaoLida,
  excluirNotificacao
} from '../api.js';

let notificacoes = [];

// Escape de HTML (previne XSS em dados vindos do banco).
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

function tempoRelativo(iso) {
  const data = new Date(iso);

  if (Number.isNaN(data.getTime())) {
    return '';
  }

  const segundos = Math.max(
    0,
    Math.floor((Date.now() - data.getTime()) / 1000)
  );

  if (segundos < 60) {
    return 'agora';
  }

  if (segundos < 3600) {
    return `há ${Math.floor(segundos / 60)} min`;
  }

  if (segundos < 86400) {
    return `há ${Math.floor(segundos / 3600)} h`;
  }

  return `há ${Math.floor(segundos / 86400)} dia(s)`;
}

function renderNotificacoes() {
  const list = document.getElementById('notificationsList');

  if (!list) return;

  list.innerHTML = notificacoes.length
    ? notificacoes.map((n) => {
        // O ícone acompanha o tipo guardado no banco. O padrão "info"
        // cobre qualquer valor que ainda não tenha uma classe própria.
        const tipo = ['success', 'warning', 'danger', 'info']
          .includes(n.tipo) ? n.tipo : 'info';

        return `
          <div class="notification-item searchable">
            <div class="notification-icon ${escapeHtml(tipo)}">
              <img src="/assets/icons/notification.png" alt="">
            </div>

            <div class="notification-content">
              <h3>
                ${escapeHtml(n.titulo || 'Notificação')}
                ${n.lida ? '' : '<span class="notification-dot"></span>'}
              </h3>

              <p>${escapeHtml(n.mensagem || '')}</p>
            </div>

            <span class="notification-time">
              ${escapeHtml(tempoRelativo(n.criado_em))}
            </span>

            ${
              n.lida ? '' : `
              <button
                type="button"
                class="notification-delete"
                data-marcar-id="${escapeHtml(n.id)}"
                aria-label="Marcar como lida"
              >
                Marcar como lida
              </button>`
            }

            <button
              type="button"
              class="notification-delete"
              data-delete-notification-id="${escapeHtml(n.id)}"
              aria-label="Excluir esta notificação"
            >
              Excluir
            </button>
          </div>
        `;
      }).join('')
    : '<p class="notification-empty">Nenhuma notificação para este usuário.</p>';

  // A busca é do app.js; depois de redesenhar, reaplica o filtro.
  const campo = document.getElementById('search-input');

  if (campo && campo.value.trim()) {
    campo.dispatchEvent(new Event('input'));
  }
}

async function carregar() {
  const list = document.getElementById('notificationsList');

  try {
    notificacoes = await listarNotificacoes();
    renderNotificacoes();
  } catch (erro) {
    console.error('Erro ao carregar notificações:', erro);

    if (list) {
      list.innerHTML =
        '<p class="notification-empty">Não foi possível carregar as notificações.</p>';
    }
  }
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

  carregar();

  const list = document.getElementById('notificationsList');

  if (list) {
    // Delegação: os botões são recriados a cada carregamento.
    list.addEventListener('click', async (event) => {
      const marcar = event.target.closest('[data-marcar-id]');

      if (marcar) {
        try {
          await marcarNotificacaoLida(marcar.dataset.marcarId);
          await carregar();
        } catch (erro) {
          console.error('Erro ao marcar notificação:', erro);
        }
        return;
      }

      const excluir = event.target.closest(
        '[data-delete-notification-id]'
      );

      if (!excluir) return;

      if (!window.confirm('Excluir esta notificação?')) return;

      try {
        await excluirNotificacao(excluir.dataset.deleteNotificationId);
        await carregar();
      } catch (erro) {
        console.error('Erro ao excluir notificação:', erro);
      }
    });
  }

  const clearBtn = document.getElementById('clearNotificationsButton');

  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (!notificacoes.length) return;

      if (!window.confirm('Excluir todas as notificações?')) return;

      clearBtn.disabled = true;

      try {
        // Não existe rota "delete all": a API exclui uma por vez e
        // sempre limitada ao usuário da sessão.
        for (const n of notificacoes) {
          await excluirNotificacao(n.id);
        }
        await carregar();
      } catch (erro) {
        console.error('Erro ao limpar notificações:', erro);
      } finally {
        clearBtn.disabled = false;
      }
    });
  }
});
