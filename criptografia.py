"""Funções de segurança para hash e verificação de senhas com bcrypt.

Este módulo é responsável por:
- Gerar um hash bcrypt de uma senha em texto plano (hash_password).
- Verificar se uma senha informada corresponde a um hash armazenado (verify_password).

Nunca armazene a senha original: apenas o hash bcrypt é gravado no banco.
"""

import bcrypt


# O bcrypt aceita no máximo 72 bytes por senha. Acima disso ele levanta erro.
_MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    """Gera um hash bcrypt para uma senha em texto plano.

    A senha original nunca deve ser armazenada. O valor retornado é um
    hash seguro, adequado para ser salvo no banco de dados da aplicação.

    Fluxo:
    1. Converte a senha para bytes (UTF-8).
    2. Recusa senhas com mais de 72 bytes (limite do bcrypt).
    3. Gera um salt aleatório e aplica bcrypt.hashpw.
    4. Devolve o hash como string UTF-8.
    """
    password_bytes = password.encode("utf-8")

    if len(password_bytes) > _MAX_PASSWORD_BYTES:
        raise ValueError("A senha deve ter no máximo 72 bytes.")

    password_hash = bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt(),
    )
    return password_hash.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Verifica se a senha informada corresponde ao hash bcrypt.

    Retorna False quando a senha não corresponde, em vez de armazenar
    novamente a senha ou realizar qualquer comparação direta.

    Fluxo:
    1. Converte a senha para bytes (UTF-8).
    2. Recusa senhas com mais de 72 bytes (limite do bcrypt).
    3. Chama bcrypt.checkpw, que compara o hash sem expor a senha.
    4. Retorna True ou False. Hash inválido também retorna False.
    """
    password_bytes = password.encode("utf-8")

    if len(password_bytes) > _MAX_PASSWORD_BYTES:
        return False

    try:
        return bcrypt.checkpw(
            password_bytes,
            password_hash.encode("utf-8"),
        )
    except (TypeError, ValueError):
        # Hash inválido não deve gerar uma exceção para o chamador.
        return False
