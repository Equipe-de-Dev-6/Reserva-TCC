"""Modelos de dados da aplicação.

Cada modelo descreve o formato que a API aceita ou devolve. As validações
moram aqui (e-mail com formato, cargo controlado, tamanho da senha), para
que nenhuma rota precise repetir a checagem.
"""

from typing import Literal
import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ============================================================
# MODELO: USUÁRIO
# ============================================================

# O banco guarda 'Professor' e 'Coordenador' com inicial maiúscula.
Cargo = Literal['Professor', 'Coordenador']

# O bcrypt opera com no máximo 72 bytes. O limite é conferido em bytes e
# não em caracteres, porque um acento ocupa mais de um byte.
MAX_SENHA_BYTES = 72


def _validar_tamanho_senha(valor: str) -> str:
    """Recusa senha longa demais, que o bcrypt recusaria com erro 500."""
    tamanho = len(valor.encode('utf-8'))

    if tamanho > MAX_SENHA_BYTES:
        raise ValueError(
            f'A senha deve ter no máximo {MAX_SENHA_BYTES} bytes.'
        )

    if not valor.strip():
        raise ValueError('A senha não pode ficar em branco.')

    return valor


class Usuario(BaseModel):
    """Cadastro de usuário."""

    model_config = ConfigDict(str_strip_whitespace=True)

    nome: str = Field(min_length=1, max_length=60)
    email: EmailStr
    senha: str
    cargo: Cargo = 'Professor'

    @field_validator('senha')
    @classmethod
    def checar_senha(cls, valor: str) -> str:
        return _validar_tamanho_senha(valor)

    @classmethod
    def fromJson(cls, json: dict):
        return cls(
            nome=json['nome'],
            email=json['email'],
            senha=json['senha'],
            cargo=json['cargo']
        )

    def toJson(self):
        """Dados que vão para o banco, sem o hash no lugar da senha."""
        return {
            'nome': self.nome,
            'email': self.email,
            'senha': self.senha,
            'cargo': self.cargo
        }


class UsuarioAtualizacao(BaseModel):
    """Edição de usuário já cadastrado.

    A senha não entra aqui de propósito: trocar a senha é outra operação,
    e um campo opcional seria lido como "trocar a senha para vazio" por
    qualquer chamada que não o mande.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    nome: str | None = Field(default=None, min_length=1, max_length=60)
    email: EmailStr | None = None
    cargo: Cargo | None = None

    def toJson(self):
        """Só os campos preenchidos entram na consulta de atualização."""
        return {
            campo: valor
            for campo, valor in {
                'nome': self.nome,
                'email': self.email,
                'cargo': self.cargo
            }.items()
            if valor is not None
        }


# ============================================================
# MODELO: SALA
# ============================================================

class Sala(BaseModel):
    """Sala como a API a devolve.

    As colunas são str, bool e dict no banco (a migração garante que não
    aceitam nulo), mas a API não deve quebrar se uma linha antiga ainda
    estiver fora do padrão: por isso os campos são tolerantes e o
    trasnformador normaliza o que vier.
    """

    nome: str = ''
    caracteristica: str = ''
    disponibilidade: bool = True
    historico: dict | list = Field(default_factory=dict)

    @classmethod
    def fromJson(cls, json: dict):
        return cls(
            nome=json.get('nome') or '',
            caracteristica=json.get('caracteristica') or '',
            disponibilidade=bool(json.get('disponibilidade', True)),
            historico=json.get('historico') or {}
        )

    def toJson(self):
        return {
            'nome': self.nome,
            'caracteristica': self.caracteristica,
            'disponibilidade': self.disponibilidade,
            'historico': self.historico
        }


class SalaEdicao(BaseModel):
    """Cadastro e edição de sala, pela tela de gerenciamento.

    A tela envia os campos separados (setor, capacidade, equipamentos,
    descrição), porque é assim que o formulário é preenchido. O banco,
    por outro lado, guarda tudo em uma única coluna de texto
    "caracteristica". Montar o texto aqui evita que a API receba campos
    que não conhece e devolva uma sala sem característica.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    nome: str = Field(min_length=1, max_length=60)
    setor: str = Field(default='', max_length=100)
    quantidade_alunos: int | None = Field(default=None, ge=0, le=999)
    equipamentos: list[str] = Field(default_factory=list, max_length=50)
    descricao: str = Field(default='', max_length=500)
    disponibilidade: bool = True

    # Define se a sala aparece nas telas de reserva. O padrão é False
    # para que uma sala nova só entre na oferta depois de alguém
    # marcar a caixa de propósito.
    reservavel: bool = False

    def caracteristica(self) -> str:
        """Monta o texto da coluna "caracteristica".

        O formato é o mesmo que o cadastro do campus produziu, e é o
        que a leitura (ler_contexto) sabe desmontar:
        "Quantidade de alunos: 32; Setor: TSI; Equipamentos: Projetor;
        Descrição: Sala de aula".
        """
        partes = []

        if self.quantidade_alunos is not None:
            partes.append(f"Quantidade de alunos: {self.quantidade_alunos}")

        if self.setor:
            partes.append(f"Setor: {self.setor}")

        equipamentos = [
            item.strip()
            for item in self.equipamentos
            if item and item.strip()
        ]

        if equipamentos:
            partes.append(f"Equipamentos: {', '.join(equipamentos)}")

        if self.descricao:
            partes.append(f"Descrição: {self.descricao}")

        return '; '.join(partes)

    def toJson(self):
        return {
            'nome': self.nome,
            'caracteristica': self.caracteristica(),
            'disponibilidade': self.disponibilidade,
            'reservavel': self.reservavel
        }


# ============================================================
# MODELO: CARRINHO
# ============================================================

class Carrinho(BaseModel):

    nome: str = ''
    disponibilidade: bool = True

    @classmethod
    def fromJson(cls, json: dict):
        return cls(
            nome=json.get('nome') or '',
            disponibilidade=bool(json.get('disponibilidade', True))
        )

    def toJson(self):
        return {
            'nome': self.nome,
            'disponibilidade': self.disponibilidade
        }


# ============================================================
# MODELO: RESERVA
# ============================================================

class Reserva(BaseModel):
    """Dados preenchidos pelo professor no formulário de reserva.

    Os nomes dos campos são iguais aos que o "reservas.js" envia,
    para que a reserva gravada no banco e a exibida nas telas
    usem exatamente os mesmos nomes.
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    data: str
    horaEntrada: str
    horaSaida: str
    professor: str = Field(min_length=1, max_length=60)
    curso: str = Field(min_length=1, max_length=100)
    motivo: str = Field(default='', max_length=2000)
    categoria: str = Field(default='', max_length=60)
    item: str = Field(default='', max_length=100)

    # Id da sala, quando a tela de escolha sabe informar. Gabinetes e
    # carrinhos ainda não têm cadastro, e nesse caso o nome vem em "item".
    salaId: int | None = None


# ============================================================
# MODELO: DECISÃO DA RESERVA
# ============================================================

class DecisaoReserva(BaseModel):
    """Resposta do administrador sobre uma reserva pendente."""

    decisao: Literal['aprovada', 'negada', 'cancelada']


# ============================================================
# LEITURA DA CARACTERÍSTICA DA SALA
# ============================================================

# A coluna "caracteristica" guarda o texto que o cadastro do campus
# produziu, sempre no mesmo formato:
#
#     Quantidade de alunos: 32; Setor: TSI; Equipamentos: Projetor;
#     Descrição: Sala de aula
#
# As telas (e o "salas.js") leem esses campos separados, em "contexto".
# O texto é separado em ";" e cada pedaço em ":", uma vez só, porque a
# descrição da sala nunca traz ";" dentro dela.
#
CHAVE_SETOR = 'setor'
CHAVE_QUANTIDADE = 'quantidade_alunos'
CHAVE_EQUIPAMENTOS = 'equipamentos'
CHAVE_DESCRICAO = 'descricao'

# Quantos alunos a sala comporta, lido de "Quantidade de alunos: 32".
RE_QUANTIDADE = re.compile(r'^\d+$')


# ============================================================
# CATEGORIA DA SALA
# ============================================================

# Onde uma sala aparece nas telas de reserva. A classificação sai da
# própria descrição cadastrada ("Laboratório de informática",
# "Gabinete de notebooks", "Sala de aula"), e é feita aqui para que o
# navegador, o calendário e a reserva leiam o mesmo valor.
#
# A chave de busca é o começo da palavra, "laborat", e não o nome
# inteiro: a descrição vem com acento ("Laboratório") e o texto é lido em
# caixa baixa, então "laboratorio" nunca casaria. O valor de cada item é
# (identificador usado na filtragem, rótulo exibido).
#
# A ordem importa: "laborat" é testado antes de "sala" para que uma
# descrição como "sala de laboratórios" caia na tela de laboratórios.
CATEGORIAS = {
    'laborat': ('laboratorio', 'Laboratório'),
    'gabinete': ('gabinete', 'Gabinete'),
    'sala': ('sala', 'Sala'),
}

CATEGORIA_PADRAO = 'sala'


def categoria_da_sala(caracteristica: str) -> tuple[str, str]:
    """Classifica a sala e devolve (identificador, rótulo).

    O identificador ("laboratorio") é o que a tela usa para filtrar a
    lista; o rótulo ("Laboratório") é o que aparece no cartão e na
    reserva. Uma sala sem nenhuma palavra conhecida cai em "sala".
    """
    texto = str(caracteristica or '').lower()

    for trecho, (chave, rotulo) in CATEGORIAS.items():

        if trecho in texto:

            return chave, rotulo

    return CATEGORIA_PADRAO, CATEGORIAS[CATEGORIA_PADRAO][1]