"""Funções de segurança para hash e verificação de senhas com bcrypt."""

import bcrypt  # biblioteca de hash lento, próprio para senhas


# O bcrypt aceita no máximo 72 bytes por senha. O limite é em bytes, não
# em caracteres: "é" ocupa 2 bytes em UTF-8. Passar disso faria o bcrypt
# levantar ValueError e a rota devolver 500.
_MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    """Gera um hash bcrypt para uma senha em texto plano.

    A senha original nunca deve ser armazenada. O valor retornado é um
    hash seguro, adequado para ser salvo no banco de dados da aplicação.
    """
    # Converte para bytes antes de medir: o tamanho em caracteres não
    # protege contra senhas com acentos ou emojis.
    password_bytes = password.encode("utf-8")

    # Corta pelo limite do algoritmo antes de chamar o bcrypt, para que o
    # erro seja controlado pela API (422/400) e não um 500 inesperado.
    if len(password_bytes) > _MAX_PASSWORD_BYTES:
        raise ValueError("A senha deve ter no máximo 72 bytes.")

    # gensalt() cria um salt aleatório; ele fica dentro do hash devolvido,
    # então duas senhas iguais geram hashes diferentes.
    password_hash = bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt(),
    )

    # O banco guarda texto (TEXT/VARCHAR), não bytes, então o hash binário
    # é convertido para a representação ASCII do bcrypt.
    return password_hash.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verifica se a senha informada corresponde ao hash bcrypt.

    Retorna ``False`` quando a senha não corresponde, em vez de armazenar
    novamente a senha ou realizar qualquer comparação direta.
    """
    # Mesma regra do hash: entradas maiores que 72 bytes não podem ter
    # sido geradas por hash_password, então já são recusadas aqui.
    password_bytes = password.encode("utf-8")

    if len(password_bytes) > _MAX_PASSWORD_BYTES:
        return False

    try:
        # checkpw compara em tempo constante com o salt e o custo já
        # gravados no hash, sem precisar de uma coluna extra no banco.
        return bcrypt.checkpw(
            password_bytes,
            password_hash.encode("utf-8"),
        )
    except (TypeError, ValueError):
        # Hash inválido não deve gerar uma exceção para o chamador.
        return False
