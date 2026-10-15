/**
 * faq.js
 * Controla o acordeão de perguntas frequentes da página de ajuda.
 */

export function inicializarFaq() {
  const faqList = document.getElementById('faqList');

  if (!faqList) {
    return;
  }

  // As perguntas comecam fechadas. Antes este arquivo adicionava ".open"
  // em todos os itens assim que a tela carregava, o que anulava o
  // ".faq-answer { display: none }" do CSS: o acordeao aparecia com
  // tudo aberto e nenhuma pergunta respondia a "abre e fecha".
  faqList.addEventListener('click', (event) => {
    const question = event.target.closest('.faq-question');

    if (question) {
      question.closest('.faq-item').classList.toggle('open');
    }
  });
}
