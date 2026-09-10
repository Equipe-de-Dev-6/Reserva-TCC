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
# MODELO: SALA
# ============================================================

class Sala(BaseModel):

    nome: str
    caracteristicas: list
    disponibilidade: bool
    historico: list

    @classmethod
    def fromJson(cls, json: dict):
        return cls(
            nome=json['nome'],
            caracteristicas=json['caracteristicas'],
            disponibilidade=json['disponibilidade'],
            historico=json['historico']
        )

    def toJson(self):
        return {
            'nome': self.nome,
            'caracteristicas': self.caracteristicas,
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