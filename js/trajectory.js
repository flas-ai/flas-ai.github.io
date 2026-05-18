/* 3D trajectory viewer — static view that mirrors the original notebook
 * cell (TARGET_DOSE=2.0, N_PROMPTS_3D=5). One render, no controls; the
 * only interactivity is Plotly's built-in 3D rotate / zoom and legend
 * clicks. Hovers spell out the concept text, prompt snippet, and the
 * actual flow time t at each step.
 *
 * We collapse all sub-paths per concept into ONE polyline trace using
 * `null` separators (Plotly's standard trick) — that's ~22 WebGL meshes
 * instead of 100+, which keeps the rotate-drag smooth.
 */

const TARGET_DOSE = 2.0;
const N_PROMPTS = 5;

const root = document.getElementById('traj-plot');
const meta = document.getElementById('traj-meta');

function clip(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n).trimEnd() + '…' : s;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildTraces(data) {
  const traces = [];
  const nSteps = data.meta.n_steps;
  const tAtStep = (k) => (k / nSteps) * TARGET_DOSE;
  const promptsFor = data.prompts_by_concept || {};
  const conceptText = {};
  for (const c of data.concepts) conceptText[c.cid] = c.text;

  // Group target-dose trajectories by cid; cap to N_PROMPTS per concept.
  const byCid = new Map();
  for (const t of data.trajectories) {
    if (Math.abs(t.dose - TARGET_DOSE) > 1e-6) continue;
    if (!byCid.has(t.cid)) byCid.set(t.cid, []);
    byCid.get(t.cid).push(t);
  }
  for (const arr of byCid.values()) arr.sort((a, b) => a.pid - b.pid);

  for (const concept of data.concepts) {
    const subPaths = (byCid.get(concept.cid) || []).slice(0, N_PROMPTS);
    if (!subPaths.length) continue;

    const xs = [], ys = [], zs = [], hover = [];
    const ex = [], ey = [], ez = [], eHover = [];
    const cidPrompts = promptsFor[String(concept.cid)] || {};
    const longText = conceptText[concept.cid] || concept.label;

    for (const t of subPaths) {
      const promptStr = cidPrompts[String(t.pid)] || '';
      for (let k = 0; k < t.points.length; k++) {
        xs.push(t.points[k][0]);
        ys.push(t.points[k][1]);
        zs.push(t.points[k][2]);
        const tk = tAtStep(k);
        const stepHint = k === 0
          ? '<i>start</i> · no steering yet'
          : (k === t.points.length - 1
              ? `<i>endpoint</i> · t = ${tk.toFixed(2)}`
              : `t = ${tk.toFixed(2)}`);
        hover.push(
          `<b>${escapeHtml(concept.label)}</b><br>` +
          `<span style="color:#9aa1a4">${escapeHtml(clip(longText, 90))}</span><br>` +
          (promptStr
            ? `<span style="color:#9aa1a4">prompt: ${escapeHtml(clip(promptStr, 80))}</span><br>`
            : '') +
          stepHint + '<extra></extra>',
        );
      }
      // separator between sub-paths
      xs.push(null); ys.push(null); zs.push(null); hover.push('');

      const last = t.points[t.points.length - 1];
      ex.push(last[0]); ey.push(last[1]); ez.push(last[2]);
      eHover.push(
        `<b>${escapeHtml(concept.label)}</b><br>` +
        `<span style="color:#9aa1a4">${escapeHtml(clip(longText, 90))}</span><br>` +
        (promptStr
          ? `<span style="color:#9aa1a4">prompt: ${escapeHtml(clip(promptStr, 80))}</span><br>`
          : '') +
        `<i>endpoint</i> · t = ${TARGET_DOSE.toFixed(2)}<extra></extra>`,
      );
    }

    traces.push({
      type: 'scatter3d', mode: 'lines',
      x: xs, y: ys, z: zs,
      line: { color: concept.color, width: 4 },
      opacity: 0.85,
      name: concept.label,
      legendgroup: `c${concept.cid}`,
      showlegend: true,
      hovertemplate: '%{text}',
      text: hover,
    });
    traces.push({
      type: 'scatter3d', mode: 'markers',
      x: ex, y: ey, z: ez,
      marker: {
        size: 4.5, color: concept.color, symbol: 'diamond',
        line: { color: '#222', width: 1 },
      },
      legendgroup: `c${concept.cid}`,
      showlegend: false,
      hovertemplate: '%{text}',
      text: eHover,
    });
  }

  // origin marker
  traces.push({
    type: 'scatter3d', mode: 'markers',
    x: [data.origin[0]], y: [data.origin[1]], z: [data.origin[2]],
    marker: { size: 5, color: '#000', symbol: 'circle' },
    name: 'origin (no steering)',
    hovertemplate: '<b>origin</b><br>t = 0 · no steering<extra></extra>',
    showlegend: true,
  });

  return traces;
}

function render(data) {
  const ev = data.meta.explained_variance;
  const layout = {
    margin: { l: 0, r: 0, t: 20, b: 0 },
    paper_bgcolor: '#ffffff',
    scene: {
      xaxis: {
        title: { text: `PC 1 (${(ev[0] * 100).toFixed(1)}% var.)` },
        gridcolor: '#e9eced', zerolinecolor: '#cdd2d4',
        backgroundcolor: '#fafbfc', showbackground: true,
      },
      yaxis: {
        title: { text: `PC 2 (${(ev[1] * 100).toFixed(1)}% var.)` },
        gridcolor: '#e9eced', zerolinecolor: '#cdd2d4',
        backgroundcolor: '#fafbfc', showbackground: true,
      },
      zaxis: {
        title: { text: `PC 3 (${(ev[2] * 100).toFixed(1)}% var.)` },
        gridcolor: '#e9eced', zerolinecolor: '#cdd2d4',
        backgroundcolor: '#fafbfc', showbackground: true,
      },
      aspectmode: 'cube',
      camera: { eye: { x: 1.55, y: 1.55, z: 0.95 } },
    },
    legend: {
      itemsizing: 'constant',
      x: 1.0, y: 0.95,
      bgcolor: 'rgba(255,255,255,0.85)',
      bordercolor: '#e3e6e8', borderwidth: 1,
      font: { size: 11, family: 'Inter, system-ui, sans-serif' },
    },
    hoverlabel: {
      bgcolor: '#ffffff', bordercolor: '#cdd2d4',
      font: { family: 'Inter, system-ui, sans-serif', size: 12, color: '#161a1d' },
      align: 'left',
    },
    font: { family: 'Inter, system-ui, sans-serif', color: '#161a1d' },
  };
  Plotly.newPlot(root, buildTraces(data), layout, {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['toImage'],
  });
}

async function main() {
  let payload;
  try {
    const res = await fetch('data/trajectories.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    payload = await res.json();
  } catch (e) {
    meta.textContent =
      `Could not load data/trajectories.json (${e}). ` +
      `Run scripts/export_trajectories_from_cache.py to generate it.`;
    return;
  }
  const m = payload.meta;
  meta.textContent =
    `T = ${TARGET_DOSE.toFixed(1)}  ·  ` +
    `${payload.concepts.length} named concepts × ${N_PROMPTS} prompts × ` +
    `${m.n_steps} Euler steps  ·  ` +
    (m.n_pool_tokens
      ? `mean-pooled over first ${m.n_pool_tokens} generated tokens  ·  ` : '') +
    `Gemma-2-2B-IT, layer ${m.layer ?? 20}`;
  render(payload);
}

main();
