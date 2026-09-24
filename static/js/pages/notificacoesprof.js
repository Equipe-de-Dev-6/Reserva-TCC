// Busca o nome do usuário autenticado pela sessão do FastAPI.


        document.addEventListener('DOMContentLoaded', () => {
function escapeHtml(value) {
                return String(value ?? '').replace(
                    /[&<>"']/g,
                    (char) => ({
                        '&': '&amp;',
                        '<': '&lt;',
                        '>': '&gt;',
                        '"': '&quot;',
                        "'": '&#39;'
                    })[char]
                );
            }

            function tempoRelativo(iso) {
                const segundos = Math.max(
                    0,
                    Math.floor(
                        (Date.now() - new Date(iso).getTime()) / 1000
                    )
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
                const notificacoes = ReservasApp.getNotificacoes();

                list.innerHTML = notificacoes.length
                    ? notificacoes.map((n) => {
                        const r = n.reserva || {};
                        const status = ReservasApp.statusInfo(r.status);

                        const acao = {
                            criar: 'criada',
                            editar: 'editada',
                            cancelar: 'cancelada'
                        }[n.action] || n.action;

                        return `
                            <div class="notification-item searchable">
                                <div class="notification-icon ${n.action === 'cancelar' ? 'danger' : 'success'}">
                                    <img
                                        src="/assets/icons/calendar.png"
                                        alt=""
                                    >
                                </div>

                                <div class="notification-content">
                                    <h3>
                                        Reserva ${escapeHtml(acao)} -
                                        ${escapeHtml(
                            r.item ||
                            r.categoria ||
                            'Aviso'
                        )}
                                        <span class="notification-dot"></span>
                                    </h3>

                                    <p>
                                        Professor:
                                        ${escapeHtml(
                            r.professor ||
                            'Não informado'
                        )}
                                        · Aluno/turma:
                                        ${escapeHtml(
                            r.curso ||
                            'Não informado'
                        )}
                                        · Disciplina/motivo:
                                        ${escapeHtml(
                            r.motivo ||
                            'Não informado'
                        )}
                                        · Data:
                                        ${escapeHtml(
                            ReservasApp.formatDateBR(r.data)
                        )}
                                        · Horário:
                                        ${escapeHtml(
                            ReservasApp.formatHorario(
                                r.horaEntrada,
                                r.horaSaida
                            )
                        )}
                                        · Status:
                                        ${escapeHtml(status.label)}.
                                    </p>
                                </div>

                                <span class="notification-time">
                                    ${tempoRelativo(n.criadoEm)}
                                </span>

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
                    : '<p class="notification-empty">Nenhuma notificação de reserva.</p>';

                configurarBusca();

                const searchInput = document.getElementById('search-input');

                if (searchInput && searchInput.value.trim()) {
                    searchInput.dispatchEvent(new Event('input'));
                }
            }

            function configurarBusca() {
                const searchInput = document.getElementById('search-input');

                if (!searchInput || searchInput.dataset.bound) {
                    return;
                }

                searchInput.dataset.bound = 'true';

                searchInput.addEventListener('input', (e) => {
                    const term = e.target.value.toLowerCase().trim();

                    document
                        .querySelectorAll('#notificationsList .searchable')
                        .forEach((item) => {
                            item.style.display =
                                item.textContent.toLowerCase().includes(term)
                                    ? ''
                                    : 'none';
                        });
                });
            }

            // Renderiza as notificações.
            renderNotificacoes();

            // Atualiza quando houver alterações.
            ReservasApp.subscribe(renderNotificacoes);

            // Excluir uma notificação.
            document
                .getElementById('notificationsList')
                .addEventListener('click', (event) => {
                    const button = event.target.closest(
                        '[data-delete-notification-id]'
                    );

                    if (!button) {
                        return;
                    }

                    if (!window.confirm('Excluir esta notificação?')) {
                        return;
                    }

                    ReservasApp.deleteNotificacao(
                        button.dataset.deleteNotificationId
                    );
                });

            // Limpar todas as notificações.
            document
                .getElementById('clearNotificationsButton')
                .addEventListener('click', () => {
                    if (!ReservasApp.hasNotificacoes()) {
                        return;
                    }

                    if (!window.confirm('Excluir todas as notificações?')) {
                        return;
                    }

                    ReservasApp.clearNotificacoes();
                });

            // Dropdown do usuário.
            const userProfile = document.getElementById('userProfile');
            const userDropdown = document.getElementById('userDropdown');

            if (userProfile && userDropdown) {
                userProfile.addEventListener('click', (e) => {
                    e.stopPropagation();

                    if (userDropdown.contains(e.target)) {
                        return;
                    }

                    userDropdown.classList.toggle('active');
                });

                document.addEventListener('click', (e) => {
                    if (!userProfile.contains(e.target)) {
                        userDropdown.classList.remove('active');
                    }
                });
            }

            // Menu mobile.
            const menuToggle = document.getElementById('menuToggle');
            const sidebar = document.querySelector('.sidebar');
            const sidebarOverlay = document.getElementById('sidebarOverlay');

            if (menuToggle && sidebar && sidebarOverlay) {
                menuToggle.addEventListener('click', () => {
                    sidebar.classList.toggle('open');
                    sidebarOverlay.classList.toggle('active');
                });

                sidebarOverlay.addEventListener('click', () => {
                    sidebar.classList.remove('open');
                    sidebarOverlay.classList.remove('active');
                });
            }
        });
