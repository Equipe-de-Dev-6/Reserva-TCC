document.addEventListener("DOMContentLoaded", () => {

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

                btnSalvar.addEventListener("click", () => {

                    alert(
                        "A funcionalidade de salvar configurações ainda precisa ser conectada à API."
                    );

                });

            }

        });
