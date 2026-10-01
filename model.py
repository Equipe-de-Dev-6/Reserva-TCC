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