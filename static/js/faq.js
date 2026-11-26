/**
 * faq.js
 * Controla o acordeão de perguntas frequentes da página de ajuda.
 *
 * Fluxo:
 * 1. Localiza a lista de FAQ pelo id "faqList".
 * 2. Se não existir, não faz nada.
 * 3. Ao clicar em um elemento ".faq-question", alterna a classe
 *    "open" no item pai ".faq-item", que exibe ou esconde a resposta.
 *
 * As perguntas começam fechadas. O CSS ".faq-answer { display: none }"
 * controla o estado inicial; este script apenas alterna ao clicar.
 */
export function inicializarFaq() {
  const faqList = document.getElementById('faqList');

  if (!faqList) {
    return;
  }

  faqList.addEventListener('click', (event) => {
    const question = event.target.closest('.faq-question');

    if (question) {
      question.closest('.faq-item').classList.toggle('open');
    }
  });
}
