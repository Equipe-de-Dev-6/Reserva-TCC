import { inicializarFaq } from '../faq.js';

// O menu de perfil e o menu lateral do celular nao sao ligados aqui: o
// "/js/app.js", que o "base.html" carrega em todas as telas com menu,
// ja faz isso. Ligar de novo (era o que o "menu.js" fazia aqui) deixava
// dois eventos de "toggle" no mesmo botao, e um anulava o outro — o
// menu do usuario nao abria nesta tela.
document.addEventListener('DOMContentLoaded', () => {
  inicializarFaq();
});
