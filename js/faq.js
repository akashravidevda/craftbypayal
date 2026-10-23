// FAQ search: filters questions across the category cards and opens matches.
(() => {
  'use strict';
  const form = document.querySelector('[data-faq-search]');
  if (!form) return;
  const input = form.querySelector('input');
  const result = document.querySelector('[data-faq-result]');
  const items = [...document.querySelectorAll('[data-faq]')];
  const cards = [...document.querySelectorAll('[data-faq-card]')];

  function filter() {
    const q = input.value.trim().toLowerCase();
    let hits = 0;
    items.forEach(d => {
      const match = !q || d.textContent.toLowerCase().includes(q);
      d.hidden = !match;
      d.open = !!q && match;
      if (match) hits++;
    });
    cards.forEach(c => { c.hidden = !c.querySelector('[data-faq]:not([hidden])'); });
    result.textContent = q ? (hits ? `${hits} ${hits === 1 ? 'answer' : 'answers'} for “${input.value.trim()}”` : `No answers for “${input.value.trim()}” — try another word, or chat with us on WhatsApp.`) : '';
  }
  form.addEventListener('submit', e => { e.preventDefault(); filter(); });
  input.addEventListener('input', filter);
})();
