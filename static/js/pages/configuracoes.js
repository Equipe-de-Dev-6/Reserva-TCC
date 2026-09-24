document.addEventListener("DOMContentLoaded", () => {

            // ==================================================
            // CARREGAR NOME DO USUÁRIO PELA SESSÃO
            // ==================================================

            async function carregarUsuarioLogado() {

                try {

                    const resposta = await fetch("/usuario-logado", {
                        method: "GET",
                        credentials: "same-origin"
                    });

                    // Se não estiver autenticado, volta ao login
                    if (resposta.status === 401) {
                        window.location.href = "/";
                        return;
                    }

                    if (!resposta.ok) {
                        throw new Error("Erro ao buscar usuário.");
                    }

                    const usuario = await resposta.json();

                    // Nome no cabeçalho
                    const nomeUsuario = document.getElementById("nomeUsuario");

                    if (nomeUsuario) {
                        nomeUsuario.textContent = `Olá ${usuario.nome || 'Usuario'}`;
                    }

                    // Nome no perfil
                    const nomePerfil = document.getElementById("nomePerfil");

                    if (nomePerfil) {
                        nomePerfil.textContent = `Olá ${usuario.nome || 'Usuario'}`;
                    }

                    // Nome no campo de configurações
                    const campoNome = document.getElementById("nome");

                    if (campoNome) {
                        campoNome.value = usuario.nome || "";
                    }

                } catch (erro) {

                    console.error(
                        "Erro ao carregar usuário:",
                        erro
                    );

                }

            }

            carregarUsuarioLogado();


            // ==================================================
            // DROPDOWN DO USUÁRIO
            // ==================================================

            const userProfile =
                document.getElementById("userProfile");

            const userDropdown =
                document.getElementById("userDropdown");

            if (userProfile && userDropdown) {

                userProfile.addEventListener("click", (e) => {

                    e.stopPropagation();

                    if (userDropdown.contains(e.target)) {
                        return;
                    }

                    userDropdown.classList.toggle("active");

                });

                document.addEventListener("click", (e) => {

                    if (!userProfile.contains(e.target)) {
                        userDropdown.classList.remove("active");
                    }

                });

            }


            // ==================================================
            // MENU MOBILE
            // ==================================================

            const menuToggle =
                document.getElementById("menuToggle");

            const sidebar =
                document.querySelector(".sidebar");

            const sidebarOverlay =
                document.getElementById("sidebarOverlay");

            if (menuToggle && sidebar && sidebarOverlay) {

                menuToggle.addEventListener("click", () => {

                    sidebar.classList.toggle("open");
                    sidebarOverlay.classList.toggle("active");

                });

                sidebarOverlay.addEventListener("click", () => {

                    sidebar.classList.remove("open");
                    sidebarOverlay.classList.remove("active");

                });

            }


            // ==================================================
            // BOTÃO CANCELAR
            // ==================================================

            const btnCancelar =
                document.getElementById("btnCancelar");

            if (btnCancelar) {

                btnCancelar.addEventListener("click", () => {

                    // Recarrega o nome original da sessão
                    carregarUsuarioLogado();

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

                btnSalvar.addEventListener("click", () => {

                    alert(
                        "A funcionalidade de salvar configurações ainda precisa ser conectada à API."
                    );

                });

            }

        });
