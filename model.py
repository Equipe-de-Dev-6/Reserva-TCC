# ============================================================
# MODELO: SALA
# ============================================================
# Representa uma sala que pode ser utilizada/reservada no sistema.
#
# nome -> Nome ou identificação da sala
# caracteristicas -> Lista de características da sala
#                   Ex: ["Projetor", "Computadores", "Ar-condicionado"]
# disponibilidade -> TRUE = disponível para aluguel/reserva
#                    FALSE = indisponível
# historico -> Lista contendo o histórico de reservas/utilizações
# ============================================================

class Sala:

    def __init__(
        self,
        nome: str,
        caracteristicas: list,
        disponibilidade: bool,
        historico: list
    ):
        # Nome da sala
        self.nome = nome

        # Características/equipamentos disponíveis na sala
        self.caracteristicas = caracteristicas

        # Indica se a sala está disponível para reserva
        self.disponibilidade = disponibilidade

        # Histórico de utilização/reservas da sala
        self.historico = historico


    # ========================================================
    # FROM JSON
    # ========================================================
    # Converte um dicionário Python, normalmente recebido
    # através de uma API em formato JSON, para um objeto Sala.
    #
    # Exemplo:
    #
    # {
    #     "nome": "Laboratório 01",
    #     "caracteristicas": ["Computadores", "Projetor"],
    #     "disponibilidade": True,
    #     "historico": []
    # }
    #
    # Sala.fromJson(json)
    # ========================================================

    @classmethod
    def fromJson(cls, json: dict):

        return cls(
            nome=json['nome'],
            caracteristicas=json['caracteristicas'],
            disponibilidade=json['disponibilidade'],
            historico=json['historico']
        )


    # ========================================================
    # TO JSON
    # ========================================================
    # Converte o objeto Sala para um dicionário Python.
    #
    # Esse dicionário pode posteriormente ser convertido
    # para JSON e enviado para a API.
    #
    # Objeto Sala -> dict -> JSON
    # ========================================================

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
# Representa um notebook disponível no sistema.
#
# modelo -> Modelo do notebook
#           Ex: "Dell XPS15"
#
# status_defeito -> TRUE = notebook está quebrado
#                   FALSE = notebook está funcionando
#
# defeito -> Descrição do defeito.
#            Pode ser None caso não exista defeito.
#
# disponibilidade -> TRUE = disponível para aluguel/reserva
#                    FALSE = indisponível
# ============================================================

class Notebook:

    def __init__(
        self,
        modelo: str,
        status_defeito: bool,
        defeito: str,
        disponibilidade: bool
    ):
        # Modelo do notebook
        self.modelo = modelo

        # Indica se o notebook possui algum defeito
        self.status_defeito = status_defeito

        # Descrição do defeito
        self.defeito = defeito

        # Indica se o notebook está disponível
        self.disponibilidade = disponibilidade


    # ========================================================
    # FROM JSON
    # ========================================================
    # Converte os dados recebidos em JSON/dict para um objeto
    # da classe Notebook.
    # ========================================================

    @classmethod
    def fromJson(cls, json: dict):

        return cls(
            modelo=json['modelo'],
            status_defeito=json['status_defeito'],
            defeito=json['defeito'],
            disponibilidade=json['disponibilidade']
        )


    # ========================================================
    # TO JSON
    # ========================================================
    # Converte o objeto Notebook para um dicionário Python
    # que poderá ser enviado para a API.
    # ========================================================

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
# Representa um carrinho utilizado para transporte de
# equipamentos ou materiais.
#
# nome -> Nome ou identificação do carrinho
#
# disponibilidade -> TRUE = disponível para aluguel/reserva
#                    FALSE = indisponível
# ============================================================

class Carrinho:

    def __init__(
        self,
        nome: str,
        disponibilidade: bool
    ):
        # Nome ou identificação do carrinho
        self.nome = nome

        # Indica se o carrinho está disponível
        self.disponibilidade = disponibilidade


    # ========================================================
    # FROM JSON
    # ========================================================
    # Converte os dados recebidos da API em um objeto
    # da classe Carrinho.
    # ========================================================

    @classmethod
    def fromJson(cls, json: dict):

        return cls(
            nome=json['nome'],
            disponibilidade=json['disponibilidade']
        )


    # ========================================================
    # TO JSON
    # ========================================================
    # Converte o objeto Carrinho para um dicionário Python
    # que poderá ser enviado para a API.
    # ========================================================

    def toJson(self):

        return {
            'nome': self.nome,
            'disponibilidade': self.disponibilidade
        }