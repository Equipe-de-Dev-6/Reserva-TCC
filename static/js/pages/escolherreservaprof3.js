// ============================================================
// escolherreservaprof3.js — tela de escolha de gabinetes
// ============================================================
//
// Este arquivo não registra mais clique nos cards.
//
// O motivo: o salas.js já cria cada card com o próprio listener e,
// antes de navegar, busca a sala na API (selecionarSala()). O listener
// duplicado daqui gravava categoria fixa "Gabinete", sobrescrevia o
// contexto vindo do servidor e chamava window.location duas vezes.
//
// A tela continua carregando este arquivo para manter o histórico dos
// scripts da página, mas todo o comportamento está em salas.js.
// ============================================================
