/**
 * SafeSpaceZM — js/script.js
 * Main application logic
 *
 * Sections:
 *  1. Navigation
 *  2. Study tool panels
 *  3. Claude AI proxy helper
 *  4. Notes Simplifier
 *  5. Flashcard Generator
 *  6. Quiz Generator
 *  7. Grade Tracker
 *  8. Donations
 *  9. Impact page
 * 10. Admin panel
 * 11. Utilities / init
 */

'use strict';

/* ─────────────────────────────────────────
   1. NAVIGATION
   ───────────────────────────────────────── */

const PAGES = ['home', 'study', 'donate', 'impact', 'admin'];

/** Navigate to study page and open a specific panel */
function goStudy(panelId, btnId) {
  go('study');
  const btn = document.getElementById(btnId);
  if (btn) showPanel(panelId, btn);
}

function go(id) {
  PAGES.forEach(p => document.getElementById(p).classList.remove('active'));
  document.querySelectorAll('.nt').forEach(t => t.classList.remove('on'));
  document.getElementById(id).classList.add('active');
  const idx = PAGES.indexOf(id);
  const tabs = document.querySelectorAll('.nt');
  if (tabs[idx]) tabs[idx].classList.add('on');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (id === 'donate' || id === 'home') refreshTracker();
  if (id === 'impact') refreshImpact();
  if (id === 'admin') {
    document.getElementById('adminGate').style.display = 'flex';
    document.getElementById('adminDash').style.display = 'none';
  }
}

function toggleMob() {
  document.getElementById('mobNav').classList.toggle('open');
}

/* ─────────────────────────────────────────
   2. STUDY TOOL PANELS
   ───────────────────────────────────────── */

function showPanel(id, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.st').forEach(t => t.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  if (btn) btn.classList.add('on');
  if (id === 'p-grade') renderGrades(currentTerm);
}

/* ─────────────────────────────────────────
   3. CLAUDE AI PROXY HELPER
   Calls /api/claude (Vercel serverless fn)
   ───────────────────────────────────────── */

async function callClaude(system, userMessage) {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'API error');
  return data.content[0].text;
}

/* ─────────────────────────────────────────
   4. NOTES SIMPLIFIER
   ───────────────────────────────────────── */

async function doSimplify() {
  const raw = document.getElementById('notesIn').value.trim();
  if (!raw || raw.length < 40) { showToast('Please paste more detailed notes.'); return; }

  const btn      = document.getElementById('simplifyBtn');
  const loader   = document.getElementById('notesLoading');
  const outBox   = document.getElementById('notesOut');
  const outBody  = document.getElementById('notesRes');
  const copyBtn  = document.getElementById('copyNotesBtn');

  btn.disabled = true;
  btn.textContent = 'Thinking…';
  loader.classList.add('active');
  outBox.style.display = 'none';
  copyBtn.style.display = 'none';

  try {
    const text = await callClaude(
      `You are a study assistant for Zambian secondary school students. Summarise the notes given.
Respond in this EXACT format — use these labels, nothing else before or after:

TOPIC: [one-line topic name]

KEY POINTS:
• [concise point]
• [concise point]
• [concise point]
• [concise point]
• [concise point]

KEY TERMS:
[word] — [short definition]
[word] — [short definition]
[word] — [short definition]

Rules: 5–8 bullet points. 3–5 key terms. Plain English. No markdown or # symbols.`,
      'Simplify these notes:\n\n' + raw
    );

    // Parse and render structured output
    let html = '';
    for (const line of text.split('\n')) {
      const l = line.trim();
      if (!l) continue;
      if (l.startsWith('TOPIC:')) {
        html += `<div class="out-hd">📌 Topic</div><p style="font-weight:700;color:var(--text);margin-bottom:.8rem;">${l.replace('TOPIC:', '').trim()}</p>`;
      } else if (l === 'KEY POINTS:') {
        html += `<div class="out-hd" style="margin-top:.5rem;">• Key Points</div>`;
      } else if (l === 'KEY TERMS:') {
        html += `<div class="out-hd" style="margin-top:.9rem;">📖 Key Terms</div>`;
      } else if (l.startsWith('•')) {
        html += `<p><strong style="color:var(--orange)">•</strong> ${l.slice(1).trim()}</p>`;
      } else if (l.includes(' — ')) {
        const [term, def] = l.split(' — ');
        html += `<p><strong style="color:var(--orange2)">${term.trim()}</strong> — <span style="color:var(--muted)">${def.trim()}</span></p>`;
      }
    }

    outBody.innerHTML = html || text.replace(/\n/g, '<br>');
    outBox.style.display = 'block';
    copyBtn.style.display = 'inline-flex';
    showToast('✅ Notes simplified!', true);
  } catch (err) {
    showToast('⚠️ Could not reach AI — check connection and try again.');
    console.error('[Simplify]', err);
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ Simplify Notes';
    loader.classList.remove('active');
  }
}

function clearNotes() {
  document.getElementById('notesIn').value = '';
  document.getElementById('notesOut').style.display = 'none';
  document.getElementById('copyNotesBtn').style.display = 'none';
}

function copyResult(id) {
  const text = document.getElementById(id).innerText;
  navigator.clipboard.writeText(text).then(() => showToast('✅ Copied to clipboard!', true));
}

/* ─────────────────────────────────────────
   5. FLASHCARD GENERATOR
   ───────────────────────────────────────── */

async function doFlash() {
  const raw  = document.getElementById('flashIn').value.trim();
  const grid = document.getElementById('fcGrid');
  if (!raw) { showToast('Please paste some notes first.'); return; }

  const btn    = document.getElementById('flashBtn');
  const loader = document.getElementById('flashLoading');

  btn.disabled = true;
  btn.textContent = 'Building…';
  loader.classList.add('active');
  grid.innerHTML = '';

  try {
    const text = await callClaude(
      `You are a flashcard maker for Zambian secondary school students.
Create exactly 8 question-and-answer flashcard pairs from the content given.
Reply ONLY with a valid JSON array — no explanation, no markdown fences, no extra text.
Format: [{"q":"Question?","a":"Short answer under 15 words"},...]
Make questions that test real understanding, not just word recall.`,
      'Create 8 flashcards from:\n\n' + raw
    );

    const start = text.indexOf('[');
    const end   = text.lastIndexOf(']');
    if (start === -1 || end === -1) throw new Error('No JSON array in response');
    const cards = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(cards) || cards.length === 0) throw new Error('Empty cards');

    cards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'fc';
      el.innerHTML = `
        <div class="fc-q">${card.q}</div>
        <div class="fc-a">→ ${card.a}</div>
        <div class="fc-hint">👆 Tap to reveal answer</div>`;
      el.addEventListener('click', () => {
        el.classList.toggle('flip');
        el.querySelector('.fc-hint').textContent =
          el.classList.contains('flip') ? '👆 Tap to hide' : '👆 Tap to reveal answer';
      });
      grid.appendChild(el);
    });

    showToast('✅ ' + cards.length + ' flashcards ready!', true);
  } catch (err) {
    grid.innerHTML = '<p style="color:var(--muted);padding:1rem 0;">Could not generate flashcards — try with more detailed notes.</p>';
    showToast('⚠️ Could not reach AI. Try again.');
    console.error('[Flash]', err);
  } finally {
    btn.disabled = false;
    btn.textContent = '🗂️ Generate Flashcards';
    loader.classList.remove('active');
  }
}

function clearFlash() {
  document.getElementById('flashIn').value = '';
  document.getElementById('fcGrid').innerHTML = '';
}

/* ─────────────────────────────────────────
   6. QUIZ GENERATOR
   ───────────────────────────────────────── */

let _qAnswered = 0, _qCorrect = 0, _qTotal = 0, _qExps = [];

async function doQuiz() {
  const topic = document.getElementById('quizIn').value.trim();
  const count = parseInt(document.getElementById('quizCount').value) || 8;
  if (!topic) { showToast('Please enter a topic first.'); return; }

  const btn    = document.getElementById('quizBtn');
  const loader = document.getElementById('quizLoading');
  const list   = document.getElementById('quizList');
  const score  = document.getElementById('qzScore');

  _qAnswered = 0; _qCorrect = 0; _qTotal = 0; _qExps = [];
  score.style.display = 'none';
  list.innerHTML = '';
  btn.disabled = true;
  btn.textContent = 'Writing quiz…';
  loader.classList.add('active');

  try {
    const text = await callClaude(
      `You are a quiz maker for Zambian secondary school students.
Create multiple-choice quiz questions on the topic given.
Reply ONLY with a valid JSON array — no explanation, no markdown, no extra text.
Format: [{"q":"Question?","o":["A","B","C","D"],"c":0,"exp":"One sentence explaining the correct answer"}]
Where "c" is the zero-based index of the correct option.
Make questions educational and clearly worded.`,
      `Create ${count} multiple-choice questions about: ${topic}`
    );

    const start     = text.indexOf('[');
    const end       = text.lastIndexOf(']');
    if (start === -1 || end === -1) throw new Error('No JSON found');
    const questions = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('Empty questions');

    _qTotal = questions.length;
    _qExps  = questions.map(q => q.exp || '');

    questions.forEach((q, i) => {
      const card = document.createElement('div');
      card.className = 'qcard';
      const optsHtml = q.o.map((opt, j) =>
        `<button class="opt" onclick="ansQ(this,${j},${q.c},${i})">${String.fromCharCode(65 + j)}. ${opt}</button>`
      ).join('');
      card.innerHTML = `<p>${i + 1}. ${q.q}</p><div class="opts">${optsHtml}</div><div class="q-exp" id="qexp-${i}"></div>`;
      list.appendChild(card);
    });

    showToast('✅ ' + _qTotal + '-question quiz ready!', true);
  } catch (err) {
    list.innerHTML = '<p style="color:var(--muted);padding:1rem 0;">Could not generate quiz — please try again.</p>';
    showToast('⚠️ Could not reach AI. Try again.');
    console.error('[Quiz]', err);
  } finally {
    btn.disabled = false;
    btn.textContent = '✏️ Generate Quiz';
    loader.classList.remove('active');
  }
}

function ansQ(btn, sel, cor, idx) {
  const opts = btn.parentElement.querySelectorAll('.opt');
  opts.forEach(o => { o.disabled = true; });
  _qAnswered++;
  if (sel === cor) { btn.classList.add('ok'); _qCorrect++; }
  else { btn.classList.add('no'); opts[cor].classList.add('ok'); }
  const expEl = document.getElementById('qexp-' + idx);
  if (expEl && _qExps[idx]) { expEl.textContent = '💡 ' + _qExps[idx]; expEl.style.display = 'block'; }
  if (_qAnswered === _qTotal) {
    const pct = Math.round(_qCorrect / _qTotal * 100);
    const score = document.getElementById('qzScore');
    score.style.display = 'block';
    score.textContent = `${pct >= 80 ? '🎉' : pct >= 60 ? '💪' : '📚'} You scored ${_qCorrect}/${_qTotal} (${pct}%) — ${pct >= 80 ? 'Excellent work!' : pct >= 60 ? 'Good effort, keep going!' : "Keep studying — you've got this!"}`;
    score.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function clearQuiz() {
  document.getElementById('quizIn').value = '';
  document.getElementById('quizList').innerHTML = '';
  document.getElementById('qzScore').style.display = 'none';
  _qAnswered = 0; _qCorrect = 0; _qTotal = 0; _qExps = [];
}

/* ─────────────────────────────────────────
   7. GRADE TRACKER
   ───────────────────────────────────────── */

let currentTerm = 't1';

const DEFAULT_GRADES = {
  t1: [
    { s: 'Mathematics',        sc: 88 }, { s: 'English Language',   sc: 91 },
    { s: 'Integrated Science', sc: 76 }, { s: 'Social Studies',     sc: 85 },
    { s: 'Religious Education',sc: 73 }, { s: 'Creative Technology',sc: 64 },
    { s: 'Civic Education',    sc: 89 }
  ],
  t2: [
    { s: 'Mathematics',        sc: 74 }, { s: 'English Language',   sc: 87 },
    { s: 'Integrated Science', sc: 90 }, { s: 'Social Studies',     sc: 79 },
    { s: 'Religious Education',sc: 83 }, { s: 'Creative Technology',sc: 71 },
    { s: 'Civic Education',    sc: 65 }
  ],
  t3: [
    { s: 'Mathematics',        sc: 92 }, { s: 'English Language',   sc: 94 },
    { s: 'Integrated Science', sc: 88 }, { s: 'Social Studies',     sc: 91 },
    { s: 'Religious Education',sc: 86 }, { s: 'Creative Technology',sc: 75 },
    { s: 'Civic Education',    sc: 90 }
  ]
};

function getGrades() {
  const s = localStorage.getItem('sszmGrades');
  return s ? JSON.parse(s) : JSON.parse(JSON.stringify(DEFAULT_GRADES));
}
function saveGrades(g) { localStorage.setItem('sszmGrades', JSON.stringify(g)); }
function scoreToGrade(sc) { return sc >= 80 ? 'A' : sc >= 65 ? 'B' : sc >= 50 ? 'C' : 'D'; }

function switchTerm(term, btn) {
  document.querySelectorAll('.tb').forEach(t => t.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('gTerm').value = term;
  currentTerm = term;
  renderGrades(term);
}

function renderGrades(term) {
  const grades = getGrades()[term] || [];
  const rows   = document.getElementById('gradeRows');
  if (!rows) return;
  rows.innerHTML = '';

  if (grades.length === 0) {
    rows.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--dim);font-size:.85rem;">No grades for this term yet.</div>';
    document.getElementById('avgScore').textContent     = '—';
    document.getElementById('aCount').textContent       = '0';
    document.getElementById('improveCount').textContent = '0';
    return;
  }

  const avg  = Math.round(grades.reduce((s, g) => s + g.sc, 0) / grades.length);
  document.getElementById('avgScore').textContent     = avg + '%';
  document.getElementById('aCount').textContent       = grades.filter(g => g.sc >= 80).length;
  document.getElementById('improveCount').textContent = grades.filter(g => g.sc < 65).length;

  grades.forEach((g, i) => {
    const grade = scoreToGrade(g.sc);
    const row   = document.createElement('div');
    row.className = 'grow';
    row.title     = 'Click to delete';
    row.innerHTML = `
      <span class="subj">${g.s}</span>
      <span><span class="gpill g${grade}">${grade}</span></span>
      <span>${g.sc}%</span>
      <span><div class="pbar"><div class="pfill" style="width:${g.sc}%"></div></div></span>`;
    row.addEventListener('click', () => {
      if (confirm(`Delete "${g.s}" from ${term.toUpperCase()}?`)) {
        const all = getGrades();
        all[term].splice(i, 1);
        saveGrades(all);
        renderGrades(term);
      }
    });
    rows.appendChild(row);
  });
}

function addGrade() {
  const subj = document.getElementById('gSubject').value.trim();
  const sc   = parseInt(document.getElementById('gScore').value);
  const term = document.getElementById('gTerm').value;
  if (!subj)                         { showToast('Please enter a subject name.');          return; }
  if (isNaN(sc) || sc < 0 || sc > 100) { showToast('Score must be between 0 and 100.'); return; }
  const all = getGrades();
  all[term] = all[term].filter(g => g.s.toLowerCase() !== subj.toLowerCase());
  all[term].push({ s: subj, sc });
  saveGrades(all);
  document.getElementById('gSubject').value = '';
  document.getElementById('gScore').value   = '';
  document.querySelectorAll('.tb').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.tb')[{ t1: 0, t2: 1, t3: 2 }[term]].classList.add('on');
  currentTerm = term;
  renderGrades(term);
  showToast('✅ Grade added!', true);
}

/* ─────────────────────────────────────────
   8. DONATIONS
   ───────────────────────────────────────── */

const SEED_DONATIONS = [
  { name: 'Mulenga Banda', amount: 200, org: "Lusaka Children's Home", msg: 'Happy to help!',              date: 'Jan 2025' },
  { name: 'Chanda Kunda',  amount: 150, org: 'General donation',       msg: '',                           date: 'Jan 2025' },
  { name: 'Bwalya Mwale',  amount: 100, org: 'Hope House Kitwe',       msg: 'God bless',                  date: 'Feb 2025' },
  { name: 'Nkandu Tembo',  amount: 300, org: 'General donation',       msg: 'Keep it up SafeSpaceZM!',    date: 'Feb 2025' },
];

function getUserDonations()    { const s = localStorage.getItem('sszmDonations'); return s ? JSON.parse(s) : []; }
function saveUserDonations(d)  { localStorage.setItem('sszmDonations', JSON.stringify(d)); }
function allDonations()        { return [...SEED_DONATIONS, ...getUserDonations()]; }

function handleDonForm(e) {
  e.preventDefault();
  const name   = document.getElementById('dName').value.trim();
  const amount = parseFloat(document.getElementById('dAmount').value);
  const org    = document.getElementById('dOrg').value || 'General donation';
  const msg    = document.getElementById('dMsg').value.trim();
  if (!name || !amount || amount <= 0) return;
  const d = getUserDonations();
  d.push({ name, amount, org, msg, date: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) });
  saveUserDonations(d);
  document.getElementById('donateForm').style.display = 'none';
  document.getElementById('donSuc').style.display     = 'block';
  refreshTracker();
  setTimeout(() => {
    document.getElementById('donateForm').style.display = 'block';
    document.getElementById('donateForm').reset();
    document.getElementById('donSuc').style.display    = 'none';
  }, 6000);
}

function refreshTracker() {
  const all   = allDonations();
  const total = all.reduce((s, d) => s + d.amount, 0);
  const kids  = Math.floor(total / 60);

  // Home page
  const ht  = document.getElementById('homeTrTotal');
  const hdt = document.getElementById('homeDonTotal');
  const hk  = document.getElementById('homeKids');
  const hl  = document.getElementById('homeTrList');
  if (ht)  ht.textContent  = 'ZMW ' + total.toLocaleString();
  if (hdt) hdt.textContent = 'ZMW ' + total.toLocaleString();
  if (hk)  hk.textContent  = kids;
  if (hl)  hl.innerHTML    = [...all].slice(-4).reverse().map(d =>
    `<div class="tr-item"><span>${d.name.split(' ')[0]} ${(d.name.split(' ')[1] || '')[0] || ''}.</span><span class="tr-amt">ZMW ${d.amount}</span></div>`
  ).join('');

  // Donate page
  const bt = document.getElementById('bigTotal');
  const bc = document.getElementById('bigCount');
  const bk = document.getElementById('bigKids');
  const dr = document.getElementById('donRows');
  if (bt) bt.textContent = 'ZMW ' + total.toLocaleString();
  if (bc) bc.textContent = all.length;
  if (bk) bk.textContent = kids;
  if (dr) dr.innerHTML   = all.length === 0
    ? '<div class="empty">No donations yet — be the first! 🫶</div>'
    : [...all].reverse().map(d =>
        `<div class="dr"><span class="dr-name">${d.name}</span><span class="dr-amt">ZMW ${d.amount}</span><span class="dr-date">${d.date}</span></div>`
      ).join('');
}

/* ─────────────────────────────────────────
   9. IMPACT PAGE
   ───────────────────────────────────────── */

function refreshImpact() {
  const all   = allDonations();
  const total = all.reduce((s, d) => s + d.amount, 0);
  const kids  = Math.floor(total / 60);
  const ik    = document.getElementById('impKids');
  const it    = document.getElementById('impTotal');
  const id2   = document.getElementById('impDonors');
  if (ik)  animateNum(ik, kids);
  if (it)  { it.textContent = 'ZMW 0'; animateMoney(it, total); }
  if (id2) animateNum(id2, all.length);
  const vids = JSON.parse(localStorage.getItem('sszmVideos') || '[]');
  const grid = document.getElementById('videoGrid');
  if (!grid) return;
  const extra = vids.map(v => `
    <div class="vc">
      <div class="vthumb"><iframe src="${v.url}" allowfullscreen></iframe></div>
      <div class="vi"><h4>${v.title}</h4></div>
    </div>`).join('');
  grid.innerHTML = `
    <div class="vc">
      <div class="vthumb"><div class="play-btn">▶</div><div class="vc-lbl">Coming soon</div></div>
      <div class="vi"><h4>First Donation Delivery</h4><p>Our first trip to a Lusaka orphanage — filmed 2025.</p></div>
    </div>${extra}`;
}

function animateNum(el, target) {
  let c = 0;
  const step = Math.max(1, Math.ceil(target / 60));
  const iv   = setInterval(() => { c = Math.min(c + step, target); el.textContent = c; if (c >= target) clearInterval(iv); }, 25);
}
function animateMoney(el, target) {
  let c = 0;
  const step = Math.max(1, Math.ceil(target / 60));
  const iv   = setInterval(() => { c = Math.min(c + step, target); el.textContent = 'ZMW ' + c.toLocaleString(); if (c >= target) clearInterval(iv); }, 25);
}

/* ─────────────────────────────────────────
   10. ADMIN PANEL
   ───────────────────────────────────────── */

// ⚠️ Change this password before going live
const ADMIN_PW = 'safespace2025';

function adminLogin() {
  const pw  = document.getElementById('adminPw').value;
  const err = document.getElementById('loginErr');
  if (pw === ADMIN_PW) {
    document.getElementById('adminGate').style.display = 'none';
    document.getElementById('adminDash').style.display = 'block';
    loadAdminData();
  } else {
    err.style.display = 'block';
    setTimeout(() => err.style.display = 'none', 2500);
  }
}

function adminLogout() {
  document.getElementById('adminGate').style.display = 'flex';
  document.getElementById('adminDash').style.display = 'none';
  document.getElementById('adminPw').value = '';
}

function addVideo() {
  const title = document.getElementById('vTitle').value.trim();
  const url   = document.getElementById('vUrl').value.trim();
  if (!title || !url) { showToast('Please fill in both fields.'); return; }
  const vids = JSON.parse(localStorage.getItem('sszmVideos') || '[]');
  vids.push({ title, url, id: Date.now() });
  localStorage.setItem('sszmVideos', JSON.stringify(vids));
  document.getElementById('vTitle').value = '';
  document.getElementById('vUrl').value   = '';
  const s = document.getElementById('vidSuc');
  s.style.display = 'block';
  setTimeout(() => s.style.display = 'none', 3000);
  loadAdminData();
}

function delVideo(id) {
  if (!confirm('Delete this video?')) return;
  let vids = JSON.parse(localStorage.getItem('sszmVideos') || '[]');
  vids = vids.filter(v => v.id !== id);
  localStorage.setItem('sszmVideos', JSON.stringify(vids));
  loadAdminData();
}

function adminAddDonation() {
  const name   = document.getElementById('adminDonName').value.trim();
  const amount = parseFloat(document.getElementById('adminDonAmt').value);
  const org    = document.getElementById('adminDonOrg').value || 'General donation';
  const note   = document.getElementById('adminDonNote').value.trim();
  if (!name)                            { showToast('Please enter a donor name.'); return; }
  if (!amount || amount <= 0 || isNaN(amount)) { showToast('Please enter a valid amount.'); return; }
  const d = getUserDonations();
  d.push({ name, amount, org, msg: note, date: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) });
  saveUserDonations(d);
  document.getElementById('adminDonName').value = '';
  document.getElementById('adminDonAmt').value  = '';
  document.getElementById('adminDonNote').value = '';
  const s = document.getElementById('adminDonSuc');
  s.style.display = 'block';
  setTimeout(() => s.style.display = 'none', 3000);
  loadAdminData();
  refreshTracker();
}

function delDonation(idx) {
  if (!confirm('Remove this donation?')) return;
  const d = getUserDonations();
  d.splice(idx, 1);
  saveUserDonations(d);
  loadAdminData();
  refreshTracker();
}

function loadAdminData() {
  // Videos
  const vids = JSON.parse(localStorage.getItem('sszmVideos') || '[]');
  const vl   = document.getElementById('vidList');
  vl.innerHTML = vids.length === 0
    ? '<div class="empty">No videos added yet.</div>'
    : vids.map(v =>
        `<div class="ali"><span>${v.title}</span><button class="del-btn" onclick="delVideo(${v.id})">Delete</button></div>`
      ).join('');

  // Donations
  const dons = getUserDonations();
  const dl   = document.getElementById('adminDonList');
  dl.innerHTML = dons.length === 0
    ? '<div class="empty">No user donations submitted yet.</div>'
    : dons.map((d, i) => `
        <div class="ali" style="flex-direction:column;align-items:flex-start;gap:.3rem;">
          <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
            <strong>${d.name}</strong>
            <div style="display:flex;gap:.5rem;align-items:center;">
              <span class="vbadge">ZMW ${d.amount}</span>
              <button class="del-btn" onclick="delDonation(${i})">Remove</button>
            </div>
          </div>
          <span style="font-size:.75rem;color:var(--dim);">${d.org} · ${d.date}${d.msg ? ' · "' + d.msg + '"' : ''}</span>
        </div>`).join('');
}

/* ─────────────────────────────────────────
   11. UTILITIES & INIT
   ───────────────────────────────────────── */

// Toast notification
function showToast(msg, isGood = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = 'toast' + (isGood ? ' ok' : '') + ' show';
  setTimeout(() => t.classList.remove('show'), 2800);
}

// On load
document.addEventListener('DOMContentLoaded', () => {
  refreshTracker();
  renderGrades('t1');
});
