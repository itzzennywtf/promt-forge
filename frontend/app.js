// API endpoint (same domain — Vercel routes /api/* to serverless function)
const API_URL = '/api/generate';

// ── slider UI ──
const slider = document.getElementById('detail');
const detailLabel = document.getElementById('detail-label');
const levels = [
  [0,  20,  'Quick (Minimal)'],
  [21, 40,  'Brief'],
  [41, 60,  'Balanced'],
  [61, 80,  'Detailed'],
  [81, 100, 'Ultra Detailed'],
];
function updateSlider() {
  const v = +slider.value;
  slider.style.setProperty('--pct', v + '%');
  const lvl = levels.find(([a,b]) => v >= a && v <= b);
  detailLabel.textContent = lvl ? `${lvl[2]} (${v}%)` : v + '%';
}
slider.addEventListener('input', updateSlider);
updateSlider();

// ── char count ──
const ta = document.getElementById('raw-prompt');
const cc = document.getElementById('char-count');
ta.addEventListener('input', () => cc.textContent = ta.value.length + ' characters');

// ── generate ──
let outputText = '';

async function generatePrompt() {
  const raw = ta.value.trim();
  if (!raw) { showError('Please enter your raw prompt idea first.'); return; }

  const purpose  = document.getElementById('purpose').value;
  const style    = document.getElementById('style').value;
  const detail   = +slider.value;
  const btn      = document.getElementById('gen-btn');
  const loading  = document.getElementById('loading');
  const outEl    = document.getElementById('output-text');
  const outBox   = document.getElementById('output-box');
  const footer   = document.getElementById('output-footer');
  const errEl    = document.getElementById('error-msg');

  errEl.classList.remove('show');
  btn.disabled = true;
  loading.classList.add('show');
  outEl.innerHTML = '';
  outBox.classList.add('active');
  footer.classList.remove('show');
  outputText = '';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw, purpose, style, detail })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API error: ${response.status}`);
    }

    outputText = (data.result || '').trim();

    loading.classList.remove('show');
    outEl.textContent = outputText;
    footer.classList.add('show');

  } catch(e) {
    loading.classList.remove('show');
    showError(e.message || 'Something went wrong. Please try again.');
    outBox.classList.remove('active');
    outEl.innerHTML = '<span class="placeholder-msg">An error occurred — check the message below.</span>';
  }

  btn.disabled = false;
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = '⚠️ ' + msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 6000);
}

async function copyOutput() {
  if (!outputText) return;
  try {
    await navigator.clipboard.writeText(outputText);
    const t = document.getElementById('toast');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  } catch {
    showError('Could not copy — please select and copy manually.');
  }
}

function clearOutput() {
  const outEl = document.getElementById('output-text');
  const footer = document.getElementById('output-footer');
  const outBox = document.getElementById('output-box');
  outEl.innerHTML = '<span class="placeholder-msg"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>Your enhanced prompt will appear here after forging.</span>';
  footer.classList.remove('show');
  outBox.classList.remove('active');
  outputText = '';
}

// Enter key shortcut (Ctrl/Cmd + Enter)
ta.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generatePrompt();
});