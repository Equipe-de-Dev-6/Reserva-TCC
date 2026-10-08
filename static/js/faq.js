/**
 * faq.js
 * Controla o acordeão de perguntas frequentes da página de ajuda.
 */

export function inicializarFaq() {
  const faqList = document.getElementById('faqList');

  if (!faqList) {
    return;
  }

  faqList.querySelectorAll('.faq-item').forEach((item) => {
    item.classList.add('open');
  });

  faqList.addEventListener('click', (event) => {
    const question = event.target.closest('.faq-question');

    if (question) {
      question.closest('.faq-item').classList.toggle('open');
    }
  });
}
