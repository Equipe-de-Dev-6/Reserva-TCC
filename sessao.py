"""Sessão do usuário em cookie criptografado.

O FastAPI traz uma sessão própria (a SessionMiddleware do Starlette), mas
ela apenas **assina** o cookie: quem abrir o DevTools lê o conteúdo
inteiro. No caso do Reserva SENHA, isso expõe o e-mail, o nome e o cargo
de quem está logado para qualquer pessoa com acesso ao navegador.

Aqui a sessão é gravada com o Fernet, que cifra *e* autentica. Sem a
chave, o cookie é um texto sem sentido e não dá para adulterar. Como o
Fernet já faz a verificação de integridade, não é preciso assinar nada
em cima.

O cookie continua sendo um stateless (não há tabela de sessões): o que
muda é que agora ele não é legível. Como antes, encerrar a sessão em
todas as abas ao mesmo tempo exigiria uma lista de revogação, que não
existe — ver o README.
"""

import base64
import hashlib
import json

from cryptography.fernet import Fernet, InvalidToken
from starlette.middleware.base import BaseHTTPMiddleware


# ============================================================
# CHAVE
# ============================================================

def derivar_chave(segredo: str) -> Fernet:
    """Deriva uma chave Fernet de 32 bytes a partir da SECRET_KEY.

    O Fernet exige exatamente 32 bytes. A SECRET_KEY do .env é um texto
    de comprimento variável, então ela passa por um SHA-256 para virar
    uma chave do tamanho certo, sem precisar exigir um formato
    específico de quem configura.
    """
    digest = hashlib.sha256(segredo.encode("utf-8")).digest()

    return Fernet(base64.urlsafe_b64encode(digest))


# ============================================================
# CONTEÚDO DA SESSÃO
# ============================================================

class Sessao(dict):
    """Dicionário da sessão que sabe se foi mexido.

    O código das rotas usa `request.session` como um dicionário comum
    (`request.session["usuario_id"]`, `.get()`, `.clear()`). Esta classe
    só acrescenta o registro de alterações, para que o middleware saiba
    se vale a pena reescrever o cookie.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.alterado = bool(args or kwargs)

    def __setitem__(self, chave, valor):
        super().__setitem__(chave, valor)
        self.alterado = True

    def __delitem__(self, chave):
        super().__delitem__(chave)
        self.alterado = True

    def update(self, *args, **kwargs):
        super().update(*args, **kwargs)
        self.alterado = True

    def clear(self):
        super().clear()
        self.alterado = True

    def mark_accessed(self):
        """Existe só para compatibilidade com o middleware do Starlette.

        O Starlette chama este método quando a sessão é lida, para
        decidir se precisa gravá-la de volta. Aqui quem controla isso é
        o atributo "alterado", porque o cookie só precisa ser reescrito
        quando algo mudou de verdade.
        """


# ============================================================
# MIDDLEWARE
# ============================================================

class SessaoMiddleware(BaseHTTPMiddleware):
    """Lê e escreve a sessão em cookie criptografado.

    Se o cookie estiver ausente, adulterado ou vencido, a requisição
    segue como visitante comum — nunca com erro, e nunca com um dicionário
    meio preenchido.
    """

    def __init__(
        self,
        app,
        *,
        segredo: str,
        nome_do_cookie: str = "session",
        max_age: int = 60 * 60 * 8,
        https_only: bool = False,
        caminho: str = "/",
    ):
        super().__init__(app)

        self._fernet = derivar_chave(segredo)
        self._nome = nome_do_cookie
        # O ttl do Fernet faz o próprio token expirar, além do
        # max-age do cookie. Os dois cobrem casos diferentes: um
        # cookie pode sobreviver no navegador além do token.
        self._max_age = max_age
        self._https_only = https_only
        self._caminho = caminho

    # ------------------------------------------------------------
    # LEITURA
    # ------------------------------------------------------------

    def _abrir(self, token: str) -> Sessao:
        """Decifra o cookie. Devolve sessão vazia se não der."""
        if not token:
            return Sessao()

        try:
            bruto = self._fernet.decrypt(
                token.encode("utf-8"),
                ttl=self._max_age,
            )
        except (InvalidToken, ValueError, TypeError):
            # Cookie adulterado, de outra chave ou vencido: vale
            # tratar como visitante, e não como erro 500.
            return Sessao()

        try:
            dados = json.loads(bruto.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return Sessao()

        if not isinstance(dados, dict):
            return Sessao()

        sessao = Sessao(dados)
        # Já veio do cookie, então ainda não precisa ser reescrito.
        sessao.alterado = False

        return sessao

    # ------------------------------------------------------------
    # ESCRITA
    # ------------------------------------------------------------

    def _fechar(self, sessao: Sessao) -> str:
        """Cifra a sessão e devolve o valor do cookie."""
        bruto = json.dumps(
            dict(sessao),
            separators=(",", ":"),
        ).encode("utf-8")

        return self._fernet.encrypt(bruto).decode("utf-8")

    # ------------------------------------------------------------
    # CYCLE
    # ------------------------------------------------------------

    async def dispatch(self, request, call_next):

        sessao = self._abrir(request.cookies.get(self._nome, ""))

        # `request.session` é uma property somente-leitura do Starlette,
        # que por sua vez lê o scope. É no scope que a sessão é
        # colocada, e as rotas a acessam como um dicionário comum.
        request.scope["session"] = sessao

        resposta = await call_next(request)

        if not sessao:
            # Sessão vazia: some com o cookie, se houver.
            if self._nome in request.cookies:
                resposta.delete_cookie(
                    self._nome,
                    path=self._caminho,
                )

            return resposta

        if sessao.alterado:
            resposta.set_cookie(
                self._nome,
                self._fechar(sessao),
                max_age=self._max_age,
                httponly=True,
                secure=self._https_only,
                samesite="lax",
                path=self._caminho,
            )

        return resposta