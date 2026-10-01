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