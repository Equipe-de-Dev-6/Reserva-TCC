// ============================================================
// escolherreservaprof3.js  —  tela de escolha de gabinetes
// ============================================================
//
// Esta tela nao tem script proprio.
//
// Os cards de gabinete sao montados pelo "/js/salas.js", que le GET
// /salas e escreve dentro de [data-lista-salas]. A escolha e o
// avancamento para o passo 02 tambem sao dele.
//
// Este arquivo usava ligar um listener de clique em ".room-card"
// dentro do DOMContentLoaded. Isso nunca funcionou: o "salas.js"
// so monta os cards depois do fetch a API, entao no DOMContentLoaded
// a lista ainda estava vazia e o listener nunca era registrado em
// ninguem. O codigo tambem comparava "card.dataset.status === 'negado'",
// valor que o "salas.js" nunca escreve (ele grava 'disponivel' ou
// 'indisponivel').
//
// O arquivo continua existindo porque o template o carrega com
// <script src>, e um arquivo ausente devolveria 404 em toda visita a
// tela.
// ============================================================
