/**
 * SafeSpaceZM — js/quotes.js
 * Rotating inspirational quotes, 4.5s interval, fade transition
 */

const QUOTES = [
  {
    q: 'Education is the most powerful weapon which you can use to <span>change the world.</span>',
    a: '— Nelson Mandela'
  },
  {
    q: 'The beautiful thing about learning is that <span>nobody can take it away from you.</span>',
    a: '— B.B. King'
  },
  {
    q: 'Success is not final, failure is not fatal — it is the <span>courage to continue</span> that counts.',
    a: '— Winston Churchill'
  },
  {
    q: 'In Zambia, every child deserves a chance to learn. <span>Be part of that change.</span>',
    a: '— SafeSpaceZM'
  },
  {
    q: 'Every child who learns today <span>lifts a community tomorrow.</span>',
    a: '— SafeSpaceZM'
  }
];

let qi = 0;
let quoteTimer = null;

/** Render clickable dots into #qdots */
function buildQuoteDots() {
  const container = document.getElementById('qdots');
  if (!container) return;
  container.innerHTML = '';
  QUOTES.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'qd' + (i === 0 ? ' on' : '');
    d.setAttribute('aria-label', 'Quote ' + (i + 1));
    d.addEventListener('click', () => { setQ(i, d); resetTimer(); });
    container.appendChild(d);
  });
}

/** Set a specific quote by index */
function setQ(i, dot) {
  const qEl = document.getElementById('qText');
  const aEl = document.getElementById('qAuth');
  if (!qEl || !aEl) return;

  // Fade out
  qEl.style.opacity = '0';
  aEl.style.opacity = '0';

  setTimeout(() => {
    qEl.innerHTML = '<span>\u201C</span>' + QUOTES[i].q + '<span>\u201D</span>';
    aEl.textContent = QUOTES[i].a;

    // Fade in
    qEl.style.transition = 'opacity 0.45s';
    aEl.style.transition = 'opacity 0.45s';
    qEl.style.opacity = '1';
    aEl.style.opacity = '1';

    // Update dots
    document.querySelectorAll('.qd').forEach((d, idx) => {
      d.classList.toggle('on', idx === i);
    });
    qi = i;
  }, 280);
}

/** Advance to next quote */
function nextQuote() {
  setQ((qi + 1) % QUOTES.length, null);
}

/** Reset the auto-rotation timer */
function resetTimer() {
  if (quoteTimer) clearInterval(quoteTimer);
  quoteTimer = setInterval(nextQuote, 4500);
}

/** Start everything once DOM is ready */
document.addEventListener('DOMContentLoaded', () => {
  buildQuoteDots();
  setQ(0, null);
  resetTimer();
});
  
