# Testes do Reserva SENAI
#
#     python tests/test_api.py
#     node tests/test_reservas.js
#     node tests/test_avisos.js
#     node tests/check_wiring.js
#     node tests/check_migrations.js
#
# Ou tudo de uma vez, com o venv ativado:
#
#     python tests/run.py
#
# Os testes de Python não usam pytest de propósito: eles rodam com o
# interpretador puro, sem precisar instalar nada. Cada arquivo imprime
# "ok" ou "FALHA" por verificação e sai com código 1 se algo falhar, o
# que já serve para CI.
#
# Nenhum teste toca o banco de verdade. O cliente do Supabase é
# trocado por um dublê que registra as consultas, e o do navegador
# (localStorage/sessionStorage/fetch) por equivalentes em JavaScript.

import os
import subprocess
import sys

# A raiz do projeto, para o import de "app" funcionar de qualquer lugar.
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SUITES_PYTHON = [os.path.join(RAIZ, "tests", "test_api.py")]

SUITES_NODE = [
    os.path.join(RAIZ, "tests", "test_reservas.js"),
    os.path.join(RAIZ, "tests", "test_avisos.js"),
    os.path.join(RAIZ, "tests", "check_wiring.js"),
    os.path.join(RAIZ, "tests", "check_migrations.js"),
]


def executar(executavel, arquivos) -> bool:

    passou = True

    # Um arquivo por invocacao, e nao todos de uma vez.
    #
    # O node so executa o primeiro caminho que recebe; o resto da linha
    # de comando vira argv e e descartado sem aviso nenhum. Com
    # [node, test_reservas.js, test_avisos.js, check_wiring.js,
    # check_migrations.js] rodava so o primeiro, e o codigo de saida do
    # processo — que era 0 — era lido como se os quatro tivessem passado.
    # test_avisos.js, check_wiring.js e check_migrations.js nao rodavam,
    # e o run.py ainda anunciava "tudo certo".
    #
    # Rodar um por um tambem faz cada suitee ter o nome em cima da
    # saida dela. Sem isso nao dava para saber de onde vinha um "ok".
    # Uma falha nao interrompe as outras: o resumo vem no fim.
    for arquivo in arquivos:

        print(f"\n=== {os.path.basename(arquivo)} ===\n")

        resultado = subprocess.run(
            [executavel, arquivo],
            cwd=RAIZ,
        )

        passou = resultado.returncode == 0 and passou

    return passou


def main() -> int:

    # Os arquivos de JavaScript leem o projeto a partir do diretório
    # atual, então os testes rodam de dentro da raiz.
    passou = executar(sys.executable, SUITES_PYTHON)
    passou = executar("node", SUITES_NODE) and passou

    print("\n" + ("tudo certo" if passou else "houve falhas"))

    return 0 if passou else 1


if __name__ == "__main__":
    sys.exit(main())