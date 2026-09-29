import re
import unicodedata

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