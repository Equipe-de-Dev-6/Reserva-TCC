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

    print(f"\n=== {', '.join(os.path.basename(a) for a in arquivos)} ===\n")

    resultado = subprocess.run(
        [executavel, *arquivos],
        cwd=RAIZ,
    )

    return resultado.returncode == 0


def main() -> int:

    # Os arquivos de JavaScript leem o projeto a partir do diretório
    # atual, então os testes rodam de dentro da raiz.
    passou = executar(sys.executable, SUITES_PYTHON)
    passou = executar("node", SUITES_NODE) and passou

    print("\n" + ("tudo certo" if passou else "houve falhas"))

    return 0 if passou else 1


if __name__ == "__main__":
    sys.exit(main())