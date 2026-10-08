# Testes da API do Reserva SENAI, sem tocar no banco de verdade: o
# cliente do Supabase é trocado por um dublê que registra as consultas.
#
# A autenticação é testada de ponta a ponta (POST /login -> cookie de
# sessão -> rotas protegidas), porque é aí que fica a autorização.
#
#   python tests/test_api.py
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(RAIZ); sys.path.insert(0, RAIZ)

from fastapi.testclient import TestClient

import app as app_modulo
from app import app
from criptografia import hash_password

# ============================================================
# Dublê do Supabase
# ============================================================


class Consulta:
    def __init__(self, duble, tabela, operacao, dados=None):
        self._duble = duble
        self._tabela = tabela
        self._operacao = operacao
        self._dados = dados
        self._filtros = {}
        self._incluidos = []
        self._ordem = None

    def select(self, *_colunas):
        return self

    def eq(self, campo, valor):
        self._filtros[campo] = valor
        return self

    def gte(self, campo, valor):
        self._filtros[f"{campo}>="] = valor
        return self

    def lt(self, campo, valor):
        self._filtros[f"{campo}<"] = valor
        return self

    def neq(self, campo, valor):
        self._filtros[f"{campo}__neq"] = valor
        return self

    def in_(self, campo, valores):
        self._incluidos.append((campo, list(valores)))
        return self

    def order(self, campo, desc=False):
        self._ordem = (campo, desc)
        return self

    def insert(self, dados):
        return Consulta(self._duble, self._tabela, "insert", dados)

    def update(self, dados):
        return Consulta(self._duble, self._tabela, "update", dados)

    def delete(self):
        return Consulta(self._duble, self._tabela, "delete")

    def execute(self):
        self._duble.registros.append(
            {
                "tabela": self._tabela,
                "operacao": self._operacao,
                "dados": self._dados,
                "filtros": dict(self._filtros),
                "incluidos": list(self._incluidos),
                "ordem": self._ordem,
            }
        )

        fila = self._duble.respostas.pop(0) if self._duble.respostas else []

        return Resposta(fila)


class Resposta:
    def __init__(self, data):
        self.data = data


class SupabaseDuble:
    def __init__(self, respostas=None):
        self.respostas = list(respostas or [])
        self.registros = []

    def table(self, tabela):
        return Consulta(self, tabela, "select")


class ErroDoBanco(Exception):
    """Erro com código, como o PostgREST devolve."""

    def __init__(self, code):
        super().__init__(code)
        self.code = code


# ============================================================
# Dados de teste
# ============================================================

SENHA_PROF = "senha-de-teste-123"
SENHA_COORD = "outra-senha-456"

USUARIO_PROF = {
    "id": 10,
    "nome": "Professor Comum",
    "email": "professor@sp.senai.br",
    "senha": hash_password(SENHA_PROF),
    "cargo": "Professor",
    "_senha": SENHA_PROF,
}

USUARIO_COORD = {
    "id": 20,
    "nome": "Coordenadora",
    "email": "coord@sp.senai.br",
    "senha": hash_password(SENHA_COORD),
    "cargo": "Coordenador",
    "_senha": SENHA_COORD,
}

USUARIOS = [USUARIO_PROF, USUARIO_COORD]

SALA = {
    "id": 1,
    "nome": "C20",
    "caracteristica": (
        "Quantidade de alunos: 32; Setor: TSI; "
        "Equipamentos: Projetor, R\u00e9gua T; "
        "Descri\u00e7\u00e3o: sala de desenho"
    ),
    "disponibilidade": True,
    "historico": {},
}

LAB = {
    "id": 2,
    "nome": "C15",
    "caracteristica": (
        "Quantidade de alunos: 32; "
        "Descri\u00e7\u00e3o: Laborat\u00f3rio de ensaios"
    ),
    "disponibilidade": False,
    "historico": {},
}

RESERVA = {
    "id": 100,
    "usuario_id": 10,
    "sala_id": 1,
    "data_inicio": "2026-10-20T08:00:00+00:00",
    "data_fim": "2026-10-20T10:00:00+00:00",
    "status": "aguardando",
    "categoria": "Sala",
    "item": "C20",
    "professor": "Ana",
    "curso": "DS",
    "motivo": "Aula",
    "criado_em": "2026-10-19T08:00:00+00:00",
    "atualizado_em": "2026-10-19T08:00:00+00:00",
}


# ============================================================
# Utilidades de teste
# ============================================================

estado = {"passou": 0, "falhou": 0}


def check(nome, condicao, detalhe=None):
    if condicao:
        estado["passou"] += 1
        print(f"  ok   {nome}")
    else:
        estado["falhou"] += 1
        print(f"  FALHA {nome}" + (f" -> {detalhe}" if detalhe else ""))


class Banco:
    """Troca o supabase do app por um dublê durante o teste."""

    def __init__(self, respostas=None):
        self.duble = SupabaseDuble(respostas)
        self._original = None

    def __enter__(self):
        self._original = app_modulo.supabase
        app_modulo.supabase = self.duble
        return self.duble

    def __exit__(self, *_):
        app_modulo.supabase = self._original


def entrar(cliente, email, senha):
    """Faz login e devolve a resposta."""
    return cliente.post(
        "/login",
        data={"email": email, "senha": senha}
    )


def cliente_logado(usuario, respostas=None):
    """Cliente com sessão iniciada, e o dublê do banco pronto."""
    banco = SupabaseDuble(respostas or [])

    # A primeira consulta do login é a contagem de tentativas do
    # endereço, a segunda é a busca do usuário por e-mail.
    banco.respostas.insert(0, [])
    banco.respostas.insert(1, [usuario])

    original = app_modulo.supabase
    app_modulo.supabase = banco

    cliente = TestClient(app)

    resposta = entrar(cliente, usuario["email"], usuario["_senha"])
    assert resposta.status_code == 200, resposta.text

    cliente.__enter_app__ = (app_modulo, original)

    return cliente, banco


def fechar(cliente):
    app_modulo.supabase, original = cliente.__enter_app__
    app_modulo.supabase = original


# ============================================================
# Testes
# ============================================================

def main():
    print("\n[1] Login")

    # E-mail existente, senha certa.
    with Banco([[], [USUARIO_PROF]]):
        c = TestClient(app)
        r = entrar(c, "PROFESSOR@sp.senai.br", SENHA_PROF)

    check("aceita e-mail com caixa alta", r.status_code == 200, r.text)
    check("devolve o perfil", r.json().get("cargo") == "prof", r.text)

    with Banco([[], [USUARIO_COORD]]):
        c = TestClient(app)
        r = entrar(c, USUARIO_COORD["email"], SENHA_COORD)

    check("coordenador pelo cargo do banco", r.json().get("cargo") == "coordenador", r.text)

    # E-mail inexistente e senha errada têm que ser indistinguíveis.
    with Banco([[], []]):
        c = TestClient(app)
        r_sem_email = entrar(c, "ninguem@sp.senai.br", SENHA_PROF)

    with Banco([[], [USUARIO_PROF]]):
        c = TestClient(app)
        r_senha_errada = entrar(c, USUARIO_PROF["email"], "senha-errada")

    check("e-mail inexistente dá 401", r_sem_email.status_code == 401, str(r_sem_email.status_code))
    check("senha errada dá 401", r_senha_errada.status_code == 401, str(r_senha_errada.status_code))
    check(
        "as duas respostas são iguais",
        r_sem_email.json() == r_senha_errada.json(),
        f"{r_sem_email.json()} vs {r_senha_errada.json()}",
    )
    check(
        "a mensagem não entrega a causa",
        "não encontrado" not in r_sem_email.json().get("erro", "").lower(),
        r_sem_email.json().get("erro"),
    )

    print("\n[2] Limite de tentativas")

    # O contador vive no banco, então cada tentativa falhada responde a
    # três consultas: contar as recentes, inserir a tentativa e (as vezes)
    # limpar as vencidas. O dublê devolve sempre "nenhuma registrada" no
    # primeiro lugar, e o teste conta quantas falhas o login aceita.
    respostas = []
    for _ in range(14):
        # login: busca do usuário ->found; e a tentativa que falhou.
        respostas += [[USUARIO_PROF], []]

    original = app_modulo.supabase
    banco = SupabaseDuble(respostas)
    app_modulo.supabase = banco
    try:
        c = TestClient(app)
        codigos = [entrar(c, USUARIO_PROF["email"], "errada").status_code for _ in range(11)]
    finally:
        app_modulo.supabase = original

    check("as primeiras tentativas são recusadas com 401", codigos[0] == 401, str(codigos[:3]))

    # Com o banco sempre respondendo "0 tentativas", o limite nunca é
    # atingido: o que se quer confirmar aqui é que a contagem acontece
    # no banco e não mais na memória do processo.
    inserts = [r for r in banco.registros if r["operacao"] == "insert"]
    check("cada falha vira uma linha em login_tentativas", len(inserts) == 11, str(len(inserts)))
    check("guarda o endereço de origem", inserts and inserts[0]["dados"].get("endereco") == "testclient", str(inserts[0]["dados"] if inserts else {}))

    # -----------------------------------------------------------------
    print("\n[3] Sessão")

    c, banco = cliente_logado(USUARIO_PROF)
    r = c.get("/usuario_logado")
    check("/usuario_logado devolve o nome", r.json().get("nome") == USUARIO_PROF["nome"], r.text)
    check("/usuario_logado devolve o cargo", r.json().get("cargo") == "Professor", r.text)

    cookie = c.cookies.get("session")
    check("o cookie não carrega o hash da senha", SENHA_PROF not in str(cookie))

    # A sessão é criptografada: o e-mail, o nome e o cargo não podem
    # aparecer no cookie em texto legível.
    bruto = str(cookie)
    for segredo in (USUARIO_PROF["nome"], USUARIO_PROF["email"], "Coordenador", "Professor"):
        check(f"o cookie não expõe {segredo!r}", segredo not in bruto)

    check("o cookie parece um token do Fernet", len(bruto) > 60, bruto[:40])

    # Um cookie adulterado é recusado como sessão vazia, não como erro.
    c2 = TestClient(app)
    c2.cookies.set("session", bruto[:-4] + "AAAA")
    r = c2.get("/usuario_logado")
    check("cookie adulterado vira visitante", r.status_code == 401, str(r.status_code))

    c3 = TestClient(app)
    c3.cookies.set("session", "isto-nao-e-um-token")
    r = c3.get("/usuario_logado")
    check("cookie inválido não dá 500", r.status_code == 401, str(r.status_code))

    # O cookie de logout some.
    r = c.post("/logout", follow_redirects=False)
    check("logout responde 303", r.status_code == 303, str(r.status_code))

    r = c.get("/usuario_logado")
    check("logout derruba a sessão", r.status_code == 401, str(r.status_code))
    fechar(c)

    # -----------------------------------------------------------------
    print("\n[4] Rotas sem sessão")

    c = TestClient(app)
    sem_sessao = {
        "GET /usuarios": c.get("/usuarios"),
        "GET /salas": c.get("/salas"),
        "GET /admin/salas": c.get("/admin/salas"),
        "GET /carrinhos": c.get("/carrinhos"),
        "GET /reservas": c.get("/reservas"),
    }

    for rotulo, resposta in sem_sessao.items():
        check(f"{rotulo} exige sessão", resposta.status_code == 401, str(resposta.status_code))

    r = c.post("/usuarios", json={"nome": "X", "email": "x@y.com", "senha": "abc"})
    check("POST /usuarios exige sessão", r.status_code == 401, str(r.status_code))

    r = c.post("/salas", json={"nome": "X"})
    check("POST /salas exige sessão", r.status_code == 401, str(r.status_code))

    r = c.post("/reservas", json={
        "data": "2026-10-20", "horaEntrada": "08:00", "horaSaida": "10:00",
        "professor": "A", "curso": "B"
    })
    check("POST /reservas exige sessão", r.status_code == 401, str(r.status_code))

    r = c.patch("/reservas/1/decisao", json={"decisao": "aprovada"})
    check("PATCH decisao exige sessão", r.status_code == 401, str(r.status_code))

    # -----------------------------------------------------------------
    print("\n[5] Professor não chega na área do coordenador")

    c, banco = cliente_logado(USUARIO_PROF)

    for caminho in (
        "/aprovar_reservas_adm",
        "/configuracoes_adm",
        "/gerenciar_salas_adm",
        "/professores_adm",
        "/home_admin",
    ):
        r = c.get(caminho, follow_redirects=False)
        check(f"{caminho} manda o professor para a home", r.headers.get("location") == "/home", str(r.headers.get("location")))

    check("GET /usuarios é 403 para professor", c.get("/usuarios").status_code == 403)
    check("GET /admin/salas é 403 para professor", c.get("/admin/salas").status_code == 403)

    r = c.post("/usuarios", json={"nome": "X", "email": "x@y.com", "senha": "abc"})
    check("POST /usuarios é 403 para professor", r.status_code == 403)

    r = c.patch("/reservas/1/decisao", json={"decisao": "aprovada"})
    check("Professor não aprova", r.status_code == 403, str(r.status_code))

    r = c.patch("/reservas/1/decisao", json={"decisao": "negada"})
    check("Professor não recusa", r.status_code == 403, str(r.status_code))

    # O cadastro de usuário é do Coordenador: visitor com a tela aberta
    # criaria conta com qualquer cargo.
    r = c.get("/cadastro", follow_redirects=False)
    check("tela de cadastro fica fora do alcance do professor", r.headers.get("location") == "/home", str(r.headers.get("location")))

    c2 = TestClient(app)
    r = c2.get("/cadastro", follow_redirects=False)
    check("sem sessão, cadastro vai para o login", r.headers.get("location") == "/", str(r.headers.get("location")))

    # -----------------------------------------------------------------
    print("\n[6] Reservas do professor")

    banco.respostas.append([RESERVA])
    r = c.get("/reservas")
    reservas = r.json()

    check("lista as reservas", len(reservas) == 1, r.text)
    check(
        "filtra pela própria conta",
        banco.registros[-1]["filtros"].get("usuario_id") == 10,
        str(banco.registros[-1]["filtros"]),
    )
    check("data separada", reservas[0]["data"] == "2026-10-20", str(reservas[0]["data"]))
    check("hora separada", reservas[0]["horaEntrada"] == "08:00", str(reservas[0]["horaEntrada"]))
    check("timestamp cru também vem", reservas[0]["data_inicio"].startswith("2026-10-20T08:00"), str(reservas[0]["data_inicio"]))
    check("tem salaId", reservas[0]["salaId"] == 1, str(reservas[0]["salaId"]))

    # Cancelar a própria reserva.
    banco.respostas.append([{"usuario_id": 10}])
    banco.respostas.append([{**RESERVA, "status": "cancelada"}])
    r = c.patch("/reservas/100/decisao", json={"decisao": "cancelada"})
    check("professor cancela a própria reserva", r.status_code == 200, r.text)

    # Cancelar reserva de outro.
    banco.respostas.append([{"usuario_id": 99}])
    r = c.patch("/reservas/100/decisao", json={"decisao": "cancelada"})
    check("professor não cancela reserva de outro", r.status_code == 403, str(r.status_code))

    fechar(c)

    # -----------------------------------------------------------------
    print("\n[7] Criar reserva")

    c, banco = cliente_logado(USUARIO_PROF)
    dados = {
        "data": "2026-10-20",
        "horaEntrada": "08:00",
        "horaSaida": "10:00",
        "professor": "Ana",
        "curso": "DS",
        "motivo": "Aula",
        "categoria": "Sala",
        "item": "C20",
        "salaId": 1
    }

    # Com salaId são duas consultas: conferir a sala e inserir a reserva.
    banco.respostas.clear()
    banco.respostas.append([{"id": 1}])
    banco.respostas.append([RESERVA])
    r = c.post("/reservas", json=dados)
    check("cria a reserva", r.status_code == 201, r.text)

    insert = banco.registros[-1]
    check("dono vem da sessão", insert["dados"]["usuario_id"] == 10, str(insert["dados"]))
    check("nascendo como aguardando", insert["dados"]["status"] == "aguardando")
    check("sala_id gravado", insert["dados"].get("sala_id") == 1, str(insert["dados"].get("sala_id")))
    check("horário montado", insert["dados"]["data_inicio"] == "2026-10-20T08:00:00")

    # Sem salaId (gabinete): sala_id não vai no insert.
    banco.respostas.clear()
    banco.respostas.append([{**RESERVA, "sala_id": None}])
    r = c.post("/reservas", json={**dados, "salaId": None, "item": "Gabinete de Notebook - A"})
    check("reserva sem sala cadastrada funciona", r.status_code == 201, r.text)
    check("sala_id fica fora do insert", "sala_id" not in banco.registros[-1]["dados"])

    # SalaId que não existe: só a busca da sala acontece.
    banco.respostas.clear()
    banco.respostas.append([])
    r = c.post("/reservas", json={**dados, "salaId": 999})
    check("salaId inexistente é 400", r.status_code == 400, f"{r.status_code} {r.text}")

    # Horários inválidos: a resposta é montada antes de tocar no banco, e
    # por isso não há nada para o dublê responder.
    banco.respostas.clear()
    r = c.post("/reservas", json={**dados, "horaSaida": "07:00"})
    check("saída antes da entrada é 400", r.status_code == 400, str(r.status_code))

    banco.respostas.clear()
    r = c.post("/reservas", json={**dados, "data": "2026-02-31"})
    check("data impossível é 400", r.status_code == 400, str(r.status_code))

    banco.respostas.clear()
    banco.respostas.append([{"id": 1}])
    banco.respostas.append([RESERVA])
    r = c.post("/reservas", json={**dados, "decisao": "aprovada"})
    check("campo desconhecido é ignorado", r.status_code == 201, str(r.status_code))

    # Choque de horário: o banco recusa o insert com 23P01 (violação da
# restrição de horário sobreposto). Vai sem salaId para que a única
# consulta seja o insert.
    class ExplodindoNoInsert(SupabaseDuble):
        def table(self, tabela):
            d = self

            class InsertQuebrado:
                def insert(self, dados):
                    return self

                def execute(self):
                    raise ErroDoBanco("23P01")

            return InsertQuebrado()

    original = app_modulo.supabase
    app_modulo.supabase = ExplodindoNoInsert()
    try:
        r = c.post("/reservas", json={**dados, "salaId": None})
        check("choque de horário vira 409", r.status_code == 409, f"{r.status_code} {r.text}")
    finally:
        app_modulo.supabase = original

    fechar(c)

    # -----------------------------------------------------------------
    print("\n[8] Coordenador")

    c, banco = cliente_logado(USUARIO_COORD)

    banco.respostas.append([RESERVA])
    c.get("/reservas")
    check("coordenador vê todas as reservas", banco.registros[-1]["filtros"] == {}, str(banco.registros[-1]["filtros"]))

    banco.respostas.append([{**RESERVA, "status": "aprovada"}])
    r = c.patch("/reservas/100/decisao", json={"decisao": "aprovada"})
    check("coordenador aprova", r.status_code == 200, r.text)

    banco.respostas.append([{**RESERVA, "status": "negada"}])
    r = c.patch("/reservas/100/decisao", json={"decisao": "negada"})
    check("coordenador recusa", r.status_code == 200, r.text)

    # Decisão fora da lista é recusada na validação do modelo, antes de
    # qualquer consulta ao banco.
    r = c.patch("/reservas/100/decisao", json={"decisao": "talvez"})
    check("decisão fora da lista é 422", r.status_code == 422, str(r.status_code))

    banco.respostas.append([USUARIO_PROF])
    r = c.get("/usuarios")
    check("lista usuários", r.status_code == 200, r.text)
    check("não devolve o hash", "senha" not in (r.json()[0] if r.json() else {"senha": 1}), r.text)
    check("devolve o cargo", r.json()[0].get("cargo") == "Professor", r.text)

    banco.respostas.append([SALA, LAB])
    r = c.get("/admin/salas")
    check("lista todas as salas", len(r.json()) == 2, r.text)

    # -----------------------------------------------------------------
    print("\n[9] Cadastro de usuário")

    c, banco = cliente_logado(USUARIO_COORD)

    # Duas consultas: conferir se o e-mail já existe e depois inserir.
    banco.respostas.append([])
    banco.respostas.append([{"id": 99, "nome": "Ana", "email": "ana@sp.senai.br", "cargo": "Professor"}])
    r = c.post("/usuarios", json={
        "nome": "  Ana  ", "email": "  ANA@Sp.Senai.BR ", "senha": SENHA_PROF, "cargo": "Professor"
    })
    check("cadastra", r.status_code == 201, r.text)

    insert = banco.registros[-1]["dados"]
    check("nome sem espaços nas pontas", insert["nome"] == "Ana", str(insert["nome"]))
    check("e-mail normalizado", insert["email"] == "ana@sp.senai.br", str(insert["email"]))
    check("senha guardada como hash", insert["senha"] != SENHA_PROF and len(insert["senha"]) == 60, str(insert["senha"])[:20])
    check("checou duplicidade antes", banco.registros[-2]["filtros"].get("email") == "ana@sp.senai.br")

    banco.respostas.append([USUARIO_PROF])
    r = c.post("/usuarios", json={"nome": "Ana", "email": "ana@sp.senai.br", "senha": SENHA_PROF})
    check("e-mail repetido é 400", r.status_code == 400, str(r.status_code))

    r = c.post("/usuarios", json={"nome": "Ana", "email": "ana@x.com", "senha": "x" * 100})
    check("senha de 100 bytes é 422, não 500", r.status_code == 422, str(r.status_code))

    r = c.post("/usuarios", json={"nome": "Ana", "email": "nao-e-email", "senha": SENHA_PROF})
    check("e-mail inválido é 422", r.status_code == 422, str(r.status_code))

    r = c.post("/usuarios", json={"nome": "Ana", "email": "ana@x.com", "senha": SENHA_PROF, "cargo": "Diretor"})
    check("cargo fora da lista é 422", r.status_code == 422, str(r.status_code))

    # -----------------------------------------------------------------
    print("\n[10] Salas")

    banco.respostas.append([SALA])
    r = c.get("/salas")
    sala = r.json()[0]

    check("devolve o contexto", isinstance(sala.get("contexto"), dict), str(sala.get("contexto")))
    check("capacidade lida", sala["contexto"]["quantidade_alunos"] == 32, str(sala["contexto"]))
    check("setor lido", sala["contexto"]["setor"] == "TSI", str(sala["contexto"]))
    check("equipamentos em lista", sala["contexto"]["equipamentos"] == ["Projetor", "R\u00e9gua T"], str(sala["contexto"]))
    check("descrição lida", sala["contexto"]["descricao"] == "sala de desenho", str(sala["contexto"]))
    check("filtro por reservavel, não por lista de ids", banco.registros[-1]["filtros"].get("reservavel") is True, str(banco.registros[-1]["filtros"]))
    check("nada mais filtrando por lista de ids", banco.registros[-1]["incluidos"] == [], str(banco.registros[-1]["incluidos"]))
    check("categoria classificada no servidor", sala["categoria"] == "sala", str(sala.get("categoria")))
    check("categoria com rótulo", sala["categoriaRotulo"] == "Sala", str(sala.get("categoriaRotulo")))

    # Sala de laboratório é classificada pelo texto da descrição.
    banco.respostas.append([LAB])
    r = c.get("/salas")
    lab = r.json()[0]
    check("laboratório pela palavra na descrição", lab["categoria"] == "laboratorio", str(lab["categoria"]))
    check("rótulo de laboratório", lab["categoriaRotulo"] == "Laboratório", str(lab["categoriaRotulo"]))

    banco.respostas.append([{"id": 50, **SALA}])
    r = c.post("/salas", json={"nome": "Nova", "caracteristica": "", "disponibilidade": True})
    check("coordenador cadastra sala", r.status_code == 201, r.text)
    check("historico nasce vazio", banco.registros[-1]["dados"].get("historico") == {}, str(banco.registros[-1]["dados"]))

    banco.respostas.append([{**SALA, "nome": "C20 novo"}])
    r = c.put("/salas/1", json={"nome": "C20 novo", "caracteristica": "", "disponibilidade": False})
    check("coordenador edita sala", r.status_code == 200, r.text)

    banco.respostas.append([{"id": 1}])
    r = c.delete("/salas/1")
    check("coordenador exclui sala", r.status_code == 200, r.text)

    banco.respostas.append([])
    r = c.delete("/salas/1")
    check("sala com reserva é 400, não 500", r.status_code == 400, str(r.status_code))

    fechar(c)

    # -----------------------------------------------------------------
    print("\n[11] Toda rota entrega uma tela de verdade")

    # Este teste existe porque as telas foram movidas para pastas
    # (professor/, auth/, admin/) e o app.py continuou apontando para
    # o nome antigo: as rotas respondiam 500 sem aviso. Aqui toda rota
    # e chamada de verdade e tem que devolver uma pagina.
    c, banco = cliente_logado(USUARIO_PROF)
    quebradas = []

    for rota in (
        "/home", "/reservar", "/calendario_prof", "/notificacoes_prof",
        "/escolher_reserva_salas", "/escolher_reserva_laboratorios",
        "/escolher_reserva_gabinetes", "/ajuda", "/avisos",
        "/configuracoes", "/reservas_prof", "/passo2_reserva_prof",
        "/passo3_reserva_prof",
    ):
        r = c.get(rota)

        if r.status_code != 200:
            quebradas.append(f"{rota}={r.status_code}")
        elif "<html" not in r.text.lower():
            quebradas.append(f"{rota}=nao-e-html")

    check("todas as telas do professor abrem", not quebradas, ", ".join(quebradas))
    fechar(c)

    c, banco = cliente_logado(USUARIO_COORD)
    quebradas = []

    for rota in (
        "/home_admin", "/aprovar_reservas_adm", "/configuracoes_adm",
        "/gerenciar_salas_adm", "/professores_adm", "/cadastro",
    ):
        r = c.get(rota)

        if r.status_code != 200:
            quebradas.append(f"{rota}={r.status_code}")
        elif "<html" not in r.text.lower():
            quebradas.append(f"{rota}=nao-e-html")

    check("todas as telas do coordenador abrem", not quebradas, ", ".join(quebradas))
    fechar(c)

    # As telas de acesso nao exigem sessao.
    c2 = TestClient(app)
    quebradas = []

    for rota in ("/redefinir_senha", "/esqueceu_senha"):
        r = c2.get(rota)

        if r.status_code != 200 or "<html" not in r.text.lower():
            quebradas.append(f"{rota}={r.status_code}")

    r = c2.get("/", follow_redirects=False)
    if r.status_code != 200:
        quebradas.append(f"/={r.status_code}")

    check("as telas de acesso abrem sem sessao", not quebradas, ", ".join(quebradas))

    print("\n[13] Menu por perfil")

    # O menu saiu do HTML e virou dado, montado no app.py. O teste
    # confere o resultado: um Coordenador nao pode receber link de
    # Professor, e cada tela precisa marcar a si mesma como ativa.
    c, banco = cliente_logado(USUARIO_COORD)

    def menu_de(rota):
        banco.respostas.append([])
        html = c.get(rota).text

        itens = [
            l.split('href="')[1].split('"')[0]
            for l in html.splitlines()
            if 'class="nav-item' in l and 'href="' in l
        ]
        ativos = [
            l.split('href="')[1].split('"')[0]
            for l in html.splitlines()
            if "nav-item active" in l
        ]
        return html, itens, ativos

    PROFESSOR = (
        "/home", "/reservar", "/reservas_prof", "/calendario_prof",
        "/configuracoes", "/avisos"
    )

    html, itens, ativos = menu_de("/home_admin")

    check(
        "coordenador recebe o menu de administrador",
        itens[:5] == [
            "/home_admin", "/aprovar_reservas_adm", "/gerenciar_salas_adm",
            "/professores_adm", "/configuracoes_adm",
        ],
        str(itens),
    )
    check(
        "nenhum link de professor no menu do coordenador",
        not [i for i in itens if i in PROFESSOR],
        str([i for i in itens if i in PROFESSOR]),
    )
    check(
        "o logo aponta para a home do coordenador",
        'href="/home_admin" class="logo"' in html,
        "logo nao aponta para /home_admin",
    )
    check("a home marca a si mesma como ativa", ativos == ["/home_admin"], str(ativos))
    check("o nome vem do servidor", USUARIO_COORD["nome"] in html)

    # O esqueleto duplicado nao pode voltar a vazar no HTML.
    vazou = [m for m in ("{% extends", "{{ usuario", "{% block") if m in html]
    check("nada de sintaxe Jinja vaza na resposta", not vazou, str(vazou))

    # Cada tela marca a propria rota como ativa.
    for rota in ("/professores_adm", "/gerenciar_salas_adm",
                 "/aprovar_reservas_adm", "/configuracoes_adm"):
        _, _, ativos = menu_de(rota)
        check(f"{rota} marca a si mesma", ativos == [rota], str(ativos))

    fechar(c)

    # O Professor recebe o outro menu.
    c, banco = cliente_logado(USUARIO_PROF)
    banco.respostas.append([])
    html = c.get("/home").text

    itens_prof = [
        l.split('href="')[1].split('"')[0]
        for l in html.splitlines()
        if 'class="nav-item' in l and 'href="' in l
    ]

    check(
        "professor recebe o menu de professor",
        itens_prof[0] == "/home" and "/professores_adm" not in itens_prof,
        str(itens_prof),
    )
    fechar(c)

    print("\n[14] Sessao isolada")

    c = TestClient(app)
    r = c.get("/")
    check("sem sessão, / mostra o login", r.status_code == 200, str(r.status_code))

    c, banco = cliente_logado(USUARIO_PROF)
    r = c.get("/", follow_redirects=False)
    check("professor logado vai para /home", r.headers.get("location") == "/home", str(r.headers.get("location")))
    fechar(c)

    c, banco = cliente_logado(USUARIO_COORD)
    r = c.get("/", follow_redirects=False)
    check("coordenador logado vai para /home_admin", r.headers.get("location") == "/home_admin", str(r.headers.get("location")))
    fechar(c)

    print(f"\n{estado['passou']} passaram, {estado['falhou']} falharam\n")
    return 0 if estado["falhou"] == 0 else 1


sys.exit(main())