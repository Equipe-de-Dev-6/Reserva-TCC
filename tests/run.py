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


def executar(executavel, arquivo) -> bool:
    """Roda um arquivo de teste e devolve True quando ele passa."""

    print(f"\n=== {os.path.basename(arquivo)} ===\n")

    # Cada suíte é um processo separado: `node a.js b.js` executa só o
    # primeiro arquivo e ignoraria os outros três sem avisar.
    resultado = subprocess.run(
        [executavel, arquivo],
        cwd=RAIZ,
    )

    return resultado.returncode == 0


def main() -> int:

    # Os arquivos de JavaScript leem o projeto a partir do diretório
    # atual, então os testes rodam de dentro da raiz.
    passou = all(executar(sys.executable, arquivo) for arquivo in SUITES_PYTHON)

    # `all()` com generator pararia no primeiro False; o loop abaixo
    # roda todas as suítes para mostrar todos os problemas de uma vez.
    for arquivo in SUITES_NODE:
        passou = executar("node", arquivo) and passou

    print("\n" + ("tudo certo" if passou else "houve falhas"))

    return 0 if passou else 1


if __name__ == "__main__":
    sys.exit(main())