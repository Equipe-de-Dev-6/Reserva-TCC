# Reserva SENAI

Sistema de gerenciamento, organização e reserva de salas, laboratórios e equipamentos.

## Visão Geral

O Reserva SENAI é uma plataforma digital desenvolvida para modernizar o processo de agendamento de recursos na instituição. O sistema substitui o controle manual por meio de planilhas, oferecendo uma solução centralizada, automatizada e acessível para diretores, professores e demais usuários.

## Objetivo Geral

Desenvolver um sistema web para gerenciar, organizar e realizar a reserva de salas, laboratórios e equipamentos do SENAI, centralizando informações, automatizando o agendamento e proporcionando maior eficiência, organização e agilidade.

## Objetivos Específicos

- Desenvolver sistema de reserva automático para salas, laboratórios e equipamentos
- Centralizar informações de disponibilidade em uma única plataforma
- Automatizar o processo de agendamento
- Consultar disponibilidade de recursos em tempo real
- Facilitar o gerenciamento de reservas pela direção
- Disponibilizar histórico de reservas e utilização
- Registrar e acompanhar solicitações de manutenção
- Reduzir conflitos de agendamento e otimizar a utilização de infraestrutura

## Justificativa

Atualmente, o controle de recursos é realizado manualmente por meio de planilhas gerenciadas pela direção. Este processo demanda:

- Tempo constante de atualização e manutenção
- Centralização de informações em uma única pessoa
- Dificuldade na consulta de disponibilidade por usuários
- Processamento lento de solicitações
- Risco de conflitos de agendamento

O Reserva SENAI resolve estes problemas através da digitalização e automatização do processo, otimizando a gestão de infraestrutura e reduzindo a carga administrativa.

## Escopo

### Funcionalidades Implementadas

- Gerenciamento de cadastro de salas, laboratórios e equipamentos
- Reserva de salas e equipamentos
- Consulta de disponibilidade em tempo real
- Histórico de reservas e utilização
- Cancelamento e edição de reservas
- Registro de solicitações de manutenção
- Controle de acesso por perfil (direção e professores)
- Agenda centralizada de recursos

### Fora do Escopo

- Controle de entrada e saída física de pessoas
- Execução de manutenção de equipamentos
- Integração com sistemas externos do SENAI
- Gerenciamento de notas, frequência ou conteúdos acadêmicos
- Controle de patrimônio além do necessário para reservas
- Notificações automáticas por e-mail ou SMS (versões futuras)

## Estrutura do Projeto

```
reserva-senai/
├── frontend/          # Interface do usuário
├── backend/           # Lógica de negócio
├── database/          # Estrutura de dados
├── docs/              # Documentação
└── README.md          # Este arquivo
```

## Tecnologias

A definir conforme progresso do projeto.

## Instalação

### Pré-requisitos

- [Node.js](https://nodejs.org/) ou [Python](https://www.python.org/)
- Git
- Navegador moderno

### Setup

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/reserva-senai.git
cd reserva-senai

# Instale as dependências
npm install
# ou
pip install -r requirements.txt

# Inicie o servidor
npm start
# ou
python manage.py runserver
```

Instruções detalhadas disponíveis na [documentação](docs/).

## Perfis de Usuário

| Perfil | Permissões |
|--------|-----------|
| **Direção** | Gerenciar recursos, visualizar relatórios, aprovar manutenção |
| **Professores** | Reservar recursos, consultar disponibilidade, editar próprias reservas |
| **Usuários** | Consultar disponibilidade, realizar reservas |

## Fluxo de Reserva

1. Usuário acessa o sistema
2. Consulta disponibilidade do recurso desejado
3. Realiza a reserva
4. Sistema confirma a reserva
5. Registro é armazenado e pode ser consultado posteriormente

## Benefícios

- **Rapidez**: Consulta instantânea de disponibilidade
- **Eficiência**: Redução de trabalho administrativo manual
- **Confiabilidade**: Eliminação de conflitos de agendamento
- **Rastreabilidade**: Histórico completo de utilização de recursos
- **Escalabilidade**: Suporta crescimento da instituição

## Contribuindo

Para contribuir com o projeto:

1. Faça um Fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/sua-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona sua feature'`)
4. Push para a branch (`git push origin feature/sua-feature`)
5. Abra um Pull Request

## Suporte

Para dúvidas, bugs ou sugestões:

- Email: [seu-email@senai.com](mailto:seu-email@senai.com)
- Issues: [GitHub Issues](https://github.com/seu-usuario/reserva-senai/issues)

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

## Autores

Desenvolvido pela equipe SENAI.