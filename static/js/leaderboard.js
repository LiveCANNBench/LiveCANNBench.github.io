const TBODY = document.getElementById('tbody');
const META = document.getElementById('meta');
const UPDATED = document.getElementById('updated');
const Q = document.getElementById('q');
const SORT_BY = document.getElementById('sortBy');
const APPLY = document.getElementById('apply');

let rows = [];
let sortKey = 'pass1';
let sortDir = 'desc'; // 'asc' | 'desc'

async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.json();
}

function pct(x) {
  if (x == null || isNaN(x)) return '—';
  return (x * 100).toFixed(1) + '%';
}

function metricCell(value) {
  const p = Math.max(0, Math.min(100, Math.round((value ?? 0) * 100)));
  return `
    <div class="metric" style="--p:${p}%">
      <div class="pct">${pct(value)}</div>
      <div class="bar" aria-label="${pct(value)}"></div>
    </div>
  `;
}

function render() {
  const q = (Q.value || '').toLowerCase();
  const data = rows
    .filter(r => (r.model || '').toLowerCase().includes(q))
    .sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return sortDir === 'desc' ? (bv - av) : (av - bv);
    });

  TBODY.innerHTML = data.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.model ?? '—'}</td>
      <td>${metricCell(r.pass1)}</td>
      <td>${metricCell(r.easy)}</td>
      <td>${metricCell(r.medium)}</td>
      <td>${metricCell(r.hard)}</td>
    </tr>
  `).join('') || `<tr><td colspan="6" class="has-text-centered">No results</td></tr>`;

  // update header carets
  document.querySelectorAll('th.sortable').forEach(th => th.classList.remove('is-asc', 'is-desc'));
  const active = document.querySelector(`th.sortable[data-key="${sortKey}"]`);
  if (active) active.classList.add(sortDir === 'asc' ? 'is-asc' : 'is-desc');
}

function attachSortHandlers() {
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-key');
      if (key === sortKey) {
        sortDir = (sortDir === 'desc') ? 'asc' : 'desc';
      } else {
        sortKey = key; sortDir = 'desc';
      }
      SORT_BY.value = sortKey;
      render();
    });
  });
}

async function main() {
  // Try to read overview (for window) but don't fail if missing
  try {
    const ov = await fetchJSON('static/data/overview.json');
    if (ov?.window?.start && ov?.window?.end) {
      META.textContent = `${ov.problems ?? '—'} problems in the current window (${ov.window.start} → ${ov.window.end}).`;
    } else {
      META.textContent = 'Leaderboard';
    }
  } catch {
    META.textContent = 'Leaderboard';
  }

  try {
    rows = await fetchJSON('static/data/leaderboard.json');
  } catch (e) {
    TBODY.innerHTML = `<tr><td colspan="6" class="has-text-centered">${e.message}</td></tr>`;
    return;
  }

  UPDATED.textContent = `Last updated: ${new Date().toLocaleString()}`;

  attachSortHandlers();

  APPLY.addEventListener('click', () => {
    sortKey = SORT_BY.value || 'pass1';
    render();
  });

  Q.addEventListener('keydown', (e) => { if (e.key === 'Enter') render(); });

  render();
}

main().catch(err => {
  TBODY.innerHTML = `<tr><td colspan="6" class="has-text-centered">Failed: ${err.message}</td></tr>`;
});
