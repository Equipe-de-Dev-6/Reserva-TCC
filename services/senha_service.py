"""Serviço de senha.

Encapsula as operações de hash e verificação de senha, reutilizando o
módulo criptografia. Centraliza aqui qualquer regra de negócio sobre
senhas (tamanho mínimo, bytes máximos do bcrypt, etc.) para que não
haja duplicação entre as rotas e os testes.
"""

from criptografia import hash_password, verify_password


# O bcrypt opera com no máximo 72 bytes por senha.
MAX_SENHA_BYTES = 72


def gerar_hash(senha: str) -> str:
    """Gera o hash bcrypt de uma senha em texto plano.

    Delegado a criptografia.hash_password, que já valida o limite de
    72 bytes e levanta ValueError se a senha for longa demais.
    """
    return hash_password(senha)


def conferir_senha(senha: str, hash_armazenado: str) -> bool:
    """Verifica se a senha informada corresponde ao hash armazenado.

    Retorna True ou False, nunca levanta exceção por hash inválido.
    """
    return verify_password(senha, hash_armazenado)


def senha_valida(senha: str) -> bool:
    """Retorna True se a senha respeita as regras do sistema.

    Regras:
    - Não pode ficar em branco.
    - No máximo 72 bytes (limite do bcrypt).
    """
    if not senha or not senha.strip():
        return False
    return len(senha.encode("utf-8")) <= MAX_SENHA_BYTES
