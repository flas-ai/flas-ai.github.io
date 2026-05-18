/* FlowTime Studio widget.
 *
 * Picks (concept, prompt) from data/eval.json's `studio` array and lets the
 * user slide T to morph the steered output + C/I/F bars.
 */

const conceptSel = document.getElementById('studio-concept');
const promptSel  = document.getElementById('studio-prompt');
const slider     = document.getElementById('studio-slider');
const ftLabel    = document.getElementById('studio-flowtime-label');
const conceptText = document.getElementById('studio-concept-text');
const promptText  = document.getElementById('studio-prompt-text');
const output     = document.getElementById('studio-output');
const scoresBox  = document.getElementById('studio-scores');

let STUDIO = [];
let DOSES  = [];

function setSliderFill(input) {
  const min = +input.min, max = +input.max;
  const pct = ((+input.value - min) / (max - min)) * 100;
  input.style.setProperty('--rng-fill', `${pct}%`);
}

// concept-key → all entries with that concept (multiple prompts)
const byConcept = new Map();

function getActive() {
  const cid = +conceptSel.value;
  const pid = +promptSel.value;
  return STUDIO.find(s => s.cid === cid && s.pid === pid);
}

function tone(score) {
  if (score >= 1.5) return 'good';
  if (score < 0.75) return 'bad';
  return '';
}

function scoreBar(label, score, max = 2) {
  const pct = Math.max(0, Math.min(1, score / max)) * 100;
  const t = tone(score);
  return `<div class="score-bar ${t}">
    <span class="label">${label}</span>
    <span class="value">${score.toFixed(2)}</span>
    <span class="track"><span class="fill" style="width:${pct}%"></span></span>
  </div>`;
}

function renderActive() {
  const entry = getActive();
  if (!entry) return;

  conceptText.textContent = entry.concept;
  promptText.textContent  = entry.prompt;

  const dose = DOSES[+slider.value];
  ftLabel.innerHTML = `Flow time <code>T = ${dose.toFixed(1)}</code>`;

  const payload = entry.by_dose[dose.toFixed(1)];
  if (!payload) {
    output.textContent = '(no judged sample at this flow time)';
    scoresBox.innerHTML = '';
    return;
  }
  output.textContent = payload.gen;
  scoresBox.innerHTML =
    scoreBar('Concept', payload.c) +
    scoreBar('Instruct', payload.i) +
    scoreBar('Fluency', payload.f) +
    scoreBar('HMean', payload.h, 2);
}

function fillPromptDropdown(cid) {
  const entries = byConcept.get(cid) || [];
  promptSel.innerHTML = '';
  entries.forEach((s, idx) => {
    const opt = document.createElement('option');
    opt.value = String(s.pid);
    const truncated = s.prompt.length > 90
      ? s.prompt.slice(0, 90) + '…'
      : s.prompt;
    opt.textContent = `prompt ${idx + 1}: ${truncated}`;
    promptSel.appendChild(opt);
  });
  promptSel.value = String(entries[0].pid);
}

async function main() {
  let payload;
  try {
    const res = await fetch('data/eval.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    payload = await res.json();
  } catch (e) {
    output.textContent = `Could not load data/eval.json (${e}).`;
    return;
  }
  STUDIO = payload.studio || [];
  DOSES  = (payload.meta && payload.meta.doses) || [];
  if (!STUDIO.length || !DOSES.length) {
    output.textContent = 'eval.json has no studio data.';
    return;
  }

  for (const s of STUDIO) {
    if (!byConcept.has(s.cid)) byConcept.set(s.cid, []);
    byConcept.get(s.cid).push(s);
  }

  conceptSel.innerHTML = '';
  for (const [cid, entries] of byConcept) {
    const opt = document.createElement('option');
    opt.value = String(cid);
    const text = entries[0].concept;
    opt.textContent = `[${cid}] ${text.length > 80 ? text.slice(0, 80) + '…' : text}`;
    conceptSel.appendChild(opt);
  }
  conceptSel.value = String(STUDIO[0].cid);
  fillPromptDropdown(STUDIO[0].cid);

  slider.min = 0;
  slider.max = DOSES.length - 1;
  slider.value = Math.max(0, DOSES.indexOf(2.0));
  setSliderFill(slider);

  conceptSel.addEventListener('change', () => {
    fillPromptDropdown(+conceptSel.value);
    renderActive();
  });
  promptSel.addEventListener('change', renderActive);
  slider.addEventListener('input', () => {
    setSliderFill(slider);
    renderActive();
  });

  renderActive();
}

main();
