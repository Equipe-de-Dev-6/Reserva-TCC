import re
import unicodedata

from datetime import datetime

from pydantic import BaseModel


# ============================================================
# MODELO: USUÁRIO
# ============================================================

class Usuario(BaseModel):

    nome: str
    email: str
    senha: str

    @classmethod
    def fromJson(cls, json: dict):
        return cls(
            nome=json['nome'],
            email=json['email'],
            senha=json['senha']
        )

    def toJson(self):
        return {
            'nome': self.nome,
            'email': self.email,
            'senha': self.senha
        }


# ============================================================
# MODELO: USUÁRIO PARA ATUALIZAÇÃO
# ============================================================

class UsuarioAtualizacao(BaseModel):
    """Dados que o administrador pode alterar em um professor.

    A senha não entra aqui de propósito: trocar a senha do
    professor é uma operação à parte, feita pelo próprio
    usuário, e não pela tela de gestão de professores.
    """

    nome: str
    email: str

    def toJson(self):
        return {
            'nome': self.nome,
            'email': self.email
        }


# ============================================================
# MODELO: SALA PARA ESCRITA
# ============================================================

class SalaEscrita(BaseModel):
    """Dados que o administrador envia ao criar ou editar uma sala.

    A API monta a coluna "caracteristica" a partir dos campos
    recebidos, porque no banco a descrição da sala é um único
    texto. O contexto continua sendo derivado desse texto na
    leitura, então o frontend não muda.
    """

    nome: str
    setor: str = ''
    quantidade_alunos: int | None = None
    equipamentos: list[str] = []
    descricao: str = ''
    disponibilidade: bool = True

    def toJson(self):
        return {
            'nome': self.nome,
            'caracteristica': montar_caracteristica(self),
            'disponibilidade': self.disponibilidade
        }


# ============================================================
# MODELO: RESERVA
# ============================================================

# Status possíveis de uma reserva. "aguardando" é o estado em que
# a reserva nasce e fica parada até o administrador responder.
STATUS_AGUARDANDO = 'aguardando'
STATUS_APROVADA = 'aprovada'
STATUS_NEGADA = 'negada'
STATUS_CANCELADA = 'cancelada'

STATUS_RESERVAS = (
    STATUS_AGUARDANDO,
    STATUS_APROVADA,
    STATUS_NEGADA,
    STATUS_CANCELADA,
)


class ReservaEscrita(BaseModel):
    """Reserva enviada pelo professor ao solicitar um agendamento.

    O formulário traz a data separada das horas, então
    "data_inicio" e "data_fim" chegam como "AAAA-MM-DD" e a hora
    vai em "hora_entrada" e "hora_saida" ("HH:MM"). Se a hora vier
    embutida na data, ela é aproveitada e o campo separado é
    ignorado.
    """

    sala_id: int
    data_inicio: str
    data_fim: str
    hora_entrada: str = ''
    hora_saida: str = ''
    categoria: str = ''
    item: str = ''
    professor: str = ''
    curso: str = ''
    motivo: str = ''

    @classmethod
    def fromJson(cls, json: dict):
        return cls(
            sala_id=json['sala_id'],
            data_inicio=json['data_inicio'],
            data_fim=json['data_fim'],
            hora_entrada=json.get('hora_entrada') or '',
            hora_saida=json.get('hora_saida') or '',
            categoria=json.get('categoria') or '',
            item=json.get('item') or '',
            professor=json.get('professor') or '',
            curso=json.get('curso') or '',
            motivo=json.get('motivo') or ''
        )

    def toJson(self):
        return {
            'sala_id': self.sala_id,
            'categoria': self.categoria or None,
            'item': self.item or None,
            'professor': self.professor or None,
            'curso': self.curso or None,
            'motivo': self.motivo or None,
            'status': STATUS_AGUARDANDO
        }


def hora_para_timestamp(valor):
    """Normaliza um horário para "HH:MM:SS".

    Aceita "8:00", "08:00" e "08:00:00", e sempre devolve o
    formato que o banco guarda. Levanta ValueError quando o
    texto não é um horário válido, para a API responder 400 em
    vez de gravar um horário quebrado.
    """
    texto = str(valor or "").strip()

    if not texto:
        raise ValueError("Horário não informado")

    partes = texto.split(":")

    if len(partes) < 2:
        raise ValueError(f"Horário inválido: {texto}")

    hora = int(partes[0])
    minuto = int(partes[1])
    segundo = int(partes[2]) if len(partes) > 2 and partes[2] else 0

    if not (0 <= hora <= 23 and 0 <= minuto <= 59 and 0 <= segundo <= 59):
        raise ValueError(f"Horário fora do intervalo: {texto}")

    return f"{hora:02d}:{minuto:02d}:{segundo:02d}"


def data_para_timestamp(data, hora):
    """Junta "AAAA-MM-DD" com "HH:MM:SS" em um timestamp.

    Se a data já vier com a hora embutida
    ("2026-10-10T08:00:00"), ela é usada como está.
    """
    texto = str(data or "").strip()

    if not texto:
        raise ValueError("Data não informada")

    # Data com hora embutida: usa como veio.
    if "T" in texto:
        try:
            return datetime.fromisoformat(texto)

        except ValueError:

            raise ValueError(f'data "{texto}" não está no formato AAAA-MM-DD')

    # Rótulos do próprio navegador podem vir em dd/mm/aaaa.
    if "/" in texto:
        dia, mes, ano = texto.split("/")
        texto = f"{ano}-{mes}-{dia}"

    try:
        return datetime.fromisoformat(f"{texto}T{hora}")

    except ValueError:

        # A mensagem do datetime é técnica demais para quem está
        # preenchendo o formulário, então vira uma frase sobre o
        # formato esperado.
        raise ValueError(f'data "{texto}" não está no formato AAAA-MM-DD')


class ReservaDecisao(BaseModel):
    """Decisão do administrador sobre uma reserva pendente."""

    status: str

    def toJson(self):
        return {
            'status': self.status
        }


# ============================================================
# CONTEXTO DA SALA
# ============================================================

# Rótulos gravados na coluna "caracteristica" do banco, escritos
# das duas formas (com e sem cedilha) para não perder a informação
# de linhas antigas.
ROTULOS_CARACTERISTICA = {
    "setor": "setor",
    "quantidade de alunos": "quantidade_alunos",
    "equipamentos": "equipamentos",
    "descricao": "descricao",
    "descrição": "descricao",
}

# Procura os rótulos em qualquer ponto do texto.
PADRAO_ROTULOS = re.compile(
    r"(?P<rotulo>Quantidade de alunos|Equipamentos|Descri[çc][ãa]o|Setor)\s*:",
    re.IGNORECASE
)

# Termos usados no banco para dizer que a informação não foi preenchida.
# Comparados sem acento, porque o texto varia entre "Não informado" e
# "Nao informado".
VALORES_NAO_INFORMADOS = {
    "",
    "-",
    "--",
    "n/a",
    "n.i",
    "nao informado",
    "nao se aplica",
    "s/i"
}

# Termos que indicam a capacidade da sala quando ela não vem no
# rótulo "Quantidade de alunos".
PADRAO_CAPACIDADE = re.compile(
    r"(\d+)\s*(?:alunos?|lugares?|vagas|assentos?)",
    re.IGNORECASE
)


def remover_acentos(texto):
    """Remove os acentos, mantendo a letra base."""
    normalizado = unicodedata.normalize("NFD", texto)

    return "".join(
        caractere
        for caractere in normalizado
        if unicodedata.category(caractere) != "Mn"
    )


def limpar_texto(valor):
    """Normaliza espaços e converte "não informado" em None."""
    if valor is None:
        return None

    texto = " ".join(str(valor).split())

    if remover_acentos(texto).lower() in VALORES_NAO_INFORMADOS:
        return None

    return texto


def montar_contexto_sala(caracteristica):
    """Transforma o texto da coluna "caracteristica" em um contexto estruturado.

    O banco guarda a característica da sala em um único texto que mistura
    rótulos ("Quantidade de alunos: 32"), separadores (";" ou "|") e trechos
    livres ("Porta"). As seções são localizadas pelo rótulo, e não por uma
    divisão simples do texto, para que a lista de equipamentos continue
    inteira mesmo quando o separador ";" aparece no meio dela.
    """
    contexto = {
        "setor": None,
        "quantidade_alunos": None,
        "equipamentos": [],
        "descricao": None
    }

    texto = " ".join(str(caracteristica or "").split())

    if not texto:
        return contexto

    rotulos = list(PADRAO_ROTULOS.finditer(texto))

    # Sem rótulo, o texto inteiro descreve a sala ("Porta", "Auditório").
    # Com rótulos, o trecho anterior ao primeiro deles também é descrição.
    contexto["descricao"] = limpar_texto(
        texto[:rotulos[0].start()] if rotulos else texto
    )

    for indice, rotulo in enumerate(rotulos):

        campo = ROTULOS_CARACTERISTICA[rotulo.group("rotulo").lower()]

        # A seção vai do rótulo atual até o início do próximo.
        fim = (
            rotulos[indice + 1].start()
            if indice + 1 < len(rotulos)
            else len(texto)
        )

        valor = texto[rotulo.end():fim].strip(" ;|")

        if campo == "equipamentos":

            # Os equipamentos são separados por vírgula. Itens vazios ou
            # marcados como "não informado" são descartados.
            contexto["equipamentos"] = [
                item
                for item in (limpar_texto(parte) for parte in valor.split(","))
                if item
            ]

        elif campo == "quantidade_alunos":

            digitos = re.search(r"\d+", valor)

            contexto["quantidade_alunos"] = (
                int(digitos.group()) if digitos else None
            )

        elif contexto[campo] is None:

            contexto[campo] = limpar_texto(valor)

    # Salas antigas descrevem a capacidade fora do rótulo
    # ("Laboratório de CNC | 16 lugares").
    if contexto["quantidade_alunos"] is None:

        capacidade = PADRAO_CAPACIDADE.search(texto)

        if capacidade:
            contexto["quantidade_alunos"] = int(capacidade.group(1))

    return contexto


# ============================================================
# MONTAGEM DA COLUNA "caracteristica" DAS SALAS
# ============================================================

# Rótulos gravados na coluna "caracteristica", na mesma ordem em
# que montar_contexto_sala procura por eles.
ROTULOS_ESCRITA = (
    ("setor", "Setor"),
    ("quantidade_alunos", "Quantidade de alunos"),
    ("equipamentos", "Equipamentos"),
    ("descricao", "Descrição"),
)


def montar_caracteristica(sala):
    """Junta os campos da sala em uma única linha de texto.

    O banco guarda a característica da sala em um único campo de
    texto. A escrita faz o caminho inverso de
    montar_contexto_sala: os campos separados viram rótulos
    ("Setor: ...") separados por ";", e a leitura monta o
    contexto de volta.
    """
    partes = []

    for campo, rotulo in ROTULOS_ESCRITA:

        valor = getattr(sala, campo)

        if campo == 'equipamentos':

            # A lista de equipamentos vira uma linha separada por
            # vírgulas, que é como a leitura espera separar.
            itens = [
                item
                for item in (
                    limpar_texto(str(equipamento))
                    for equipamento in (valor or [])
                )
                if item
            ]

            if itens:
                partes.append(f"{rotulo}: {', '.join(itens)}")

            continue

        texto = limpar_texto(str(valor)) if valor is not None else None

        if texto is not None:
            partes.append(f"{rotulo}: {texto}")

    return "; ".join(partes) or None


def normalizar_historico(historico):
    """O histórico é gravado como jsonb e volta do banco como objeto vazio.

    A API sempre devolve uma lista para o frontend não precisar
    tratar dois formatos.
    """
    if isinstance(historico, list):
        return historico

    if historico:
        return [historico]

    return []


# ============================================================
# MODELO: SALA
# ============================================================

class Sala(BaseModel):

    id: int
    nome: str
    caracteristica: str
    contexto: dict
    disponibilidade: bool
    historico: list

    @classmethod
    def fromJson(cls, json: dict):
        return cls(
            id=json['id'],
            nome=json['nome'],
            caracteristica=json.get('caracteristica') or '',
            contexto=montar_contexto_sala(json.get('caracteristica')),
            disponibilidade=json.get('disponibilidade', True),
            historico=normalizar_historico(json.get('historico'))
        )

    def toJson(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'caracteristica': self.caracteristica,
            'contexto': self.contexto,
            'disponibilidade': self.disponibilidade,
            'historico': self.historico
        }


# ============================================================
# MODELO: NOTEBOOK
# ============================================================

class Notebook(BaseModel):

    modelo: str
    status_defeito: bool
    defeito: str
    disponibilidade: bool

    @classmethod
    def fromJson(cls, json: dict):
        return cls(
            modelo=json['modelo'],
            status_defeito=json['status_defeito'],
            defeito=json['defeito'],
            disponibilidade=json['disponibilidade']
        )

    def toJson(self):
        return {
            'modelo': self.modelo,
            'status_defeito': self.status_defeito,
            'defeito': self.defeito,
            'disponibilidade': self.disponibilidade
        }


# ============================================================
# MODELO: CARRINHO
# ============================================================

class Carrinho(BaseModel):

    nome: str
    disponibilidade: bool

    @classmethod
    def fromJson(cls, json: dict):
        return cls(
            nome=json['nome'],
            disponibilidade=json['disponibilidade']
        )

    def toJson(self):
        return {
            'nome': self.nome,
            'disponibilidade': self.disponibilidade
        }