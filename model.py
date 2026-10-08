from pydantic import BaseModel


# ============================================================
# MODELO: USUÁRIO
# ============================================================

class Usuario(BaseModel):

    nome: str
    email: str
    senha: str
    cargo: str

    @classmethod
    def fromJson(cls, json: dict):
        return cls(
            nome=json['nome'],
            email=json['email'],
            senha=json['senha'],
            cargo=json['cargo']
        )

    def toJson(self):
        return {
            'nome': self.nome,
            'email': self.email,
            'senha': self.senha,
            'cargo': self.cargo
        }


# ============================================================
# MODELO: SALA
# ============================================================

class Sala(BaseModel):

    nome: str
    caracteristica: str
    disponibilidade: bool
    historico: dict

    @classmethod
    def fromJson(cls, json: dict):
        return cls(
            nome=json['nome'],
            caracteristica=json['caracteristica'],
            disponibilidade=json['disponibilidade'],
            historico=json['historico']
        )

    def toJson(self):
        return {
            'nome': self.nome,
            'caracteristica': self.caracteristica,
            'disponibilidade': self.disponibilidade,
            'historico': self.historico
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


# ============================================================
# MODELO: RESERVA
# ============================================================

class Reserva(BaseModel):
    """Dados preenchidos pelo professor no formulário de reserva.

    Os nomes dos campos são iguais aos que o "reservas.js" envia,
    para que a reserva gravada no banco e a exibida nas telas
    usem exatamente os mesmos nomes.
    """

    data: str
    horaEntrada: str
    horaSaida: str
    professor: str
    curso: str
    motivo: str = ""
    categoria: str = ""
    item: str = ""


# ============================================================
# MODELO: DECISÃO DA RESERVA
# ============================================================

class DecisaoReserva(BaseModel):
    """Resposta do administrador sobre uma reserva pendente."""

    decisao: str