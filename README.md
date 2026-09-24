<div align="center">

  <img src="static/assets/img/Logo senai.png" alt="Logo Reserva SENAI" width="220">

  # Reserva SENAI

  <p><strong>Gestão inteligente de reservas de salas, laboratórios e equipamentos.</strong></p>

  <p>
    Organize ocupação, consulte disponibilidade e simplifique o agendamento
    dos recursos do SENAI em um único lugar.
  </p>

  <p>
    <img alt="FastAPI" src="https://img.shields.io/badge/API-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white">
    <img alt="Python" src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white">
    <img alt="Supabase" src="https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white">
    <img alt="Security" src="https://img.shields.io/badge/Security-bcrypt-E30613?style=flat-square">
  </p>

</div>

---

## Sobre o projeto

O **Reserva SENAI** é uma plataforma web para organizar e controlar reservas
de salas, laboratórios, gabinetes e equipamentos.

A aplicação reduz o uso de planilhas, centraliza informações de disponibilidade
e oferece uma experiência mais rápida para professores e equipe administrativa.

## Funcionalidades

- Consulta de disponibilidade de recursos.
- Reserva de salas, laboratórios e equipamentos.
- Acompanhamento de reservas e histórico de utilização.
- Área administrativa para gestão dos recursos.
- Controle de acesso com sessão de usuário.
- Autenticação protegida com hash de senha usando **bcrypt**.
- Interface responsiva para desktop e dispositivos móveis.

## Tecnologias utilizadas

| Tecnologia | Utilização |
|---|---|
| **FastAPI** | Framework da API e servidor web |
| **Python** | Backend da aplicação |
| **Supabase** | Persistência de usuários e dados |
| **HTML5** | Estrutura das páginas |
| **CSS3** | Layout, responsividade e identidade visual |
| **JavaScript** | Interações no frontend |
| **bcrypt** | Hash seguro das senhas |

## Começando

### Pré-requisitos

- Python 3.10 ou superior.
- Um projeto no Supabase configurado.
- Variáveis de ambiente do Supabase.

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/reserva-senai.git
cd reserva-senai
```

### 2. Crie um ambiente virtual

<details>
<summary><strong>Windows</strong></summary>

```powershell
python -m venv venv
.\\venv\\Scripts\\activate
```

</details>

<details>
<summary><strong>Linux ou macOS</strong></summary>

```bash
python3 -m venv venv
source venv/bin/activate
```

</details>

### 3. Instale as dependências

```bash
pip install -r requirements.txt
```

### 4. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-do-supabase
```

> **Importante:** o arquivo `.env` não deve ser enviado para o GitHub.

### 5. Inicie a aplicação

```bash
uvicorn app:app --reload
```

Acesse a aplicação no navegador:

```text
http://127.0.0.1:8000
```

## Segurança

As senhas nunca são armazenadas em texto plano.

- Durante o cadastro, a senha é processada por `hash_password()`.
- O banco recebe somente o hash bcrypt.
- Durante o login, `verify_password()` compara a senha com o hash armazenado.
- A senha original não é retornada pela API.
- O hash não é retornado nas respostas de listagem ou cadastro.

## Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/` | Página de login |
| `POST` | `/login` | Autenticação do usuário |
| `POST` | `/usuarios` | Cadastro de usuário |
| `GET` | `/usuarios` | Listagem de usuários |
| `GET` | `/salas` | Listagem de salas |
| `GET` | `/home` | Página inicial do professor |
| `GET` | `/home_admin` | Página inicial da administração |
| `GET` | `/ajuda` | Central de ajuda |

## Estrutura do projeto

```text
.
├── app.py                 # Configuração do FastAPI e rotas
├── security.py            # Hash e verificação de senhas com bcrypt
├── model.py               # Modelos de dados da aplicação
├── consulta.py            # Consultas auxiliares no Supabase
├── db.py                  # Conexão com o Supabase
├── static/
│   ├── css/               # Estilos das páginas
│   ├── js/                # Interações do frontend
│   └── assets/            # Imagens e ícones
├── templates/             # Templates HTML
├── .env                   # Variáveis de ambiente (não versionado)
└── requirements.txt       # Dependências do projeto
```

## Roadmap

- [ ] Melhorar o sistema de perfis e permissões.
- [ ] Adicionar gestão completa de salas e equipamentos.
- [ ] Implementar histórico detalhado de reservas.
- [ ] Adicionar notificações de conflitos e confirmações.
- [ ] Ampliar testes automatizados para a API.

---

<div align="center">

Desenvolvido para organizar os recursos e simplificar a rotina do SENAI.

</div>
