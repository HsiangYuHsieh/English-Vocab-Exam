(function () {
  const units = VOCAB_DATA.units;
  const unitTabsEl = document.getElementById('unitTabs');
  const wordListEl = document.getElementById('wordList');
  const searchBoxEl = document.getElementById('searchBox');
  const toggleBtn = document.getElementById('toggleExamples');
  const wordCountEl = document.getElementById('wordCount');
  const emptyStateEl = document.getElementById('emptyState');

  let currentUnit = units[0].unit;
  let showExamples = true;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function highlight(text, query) {
    const safe = escapeHtml(text);
    if (!query) return safe;
    const re = new RegExp('(' + escapeRegExp(query) + ')', 'ig');
    return escapeHtml(text).replace(re, '<mark>$1</mark>');
  }

  function buildTabs() {
    const allBtn = document.createElement('button');
    allBtn.className = 'unit-tab';
    allBtn.textContent = '全部';
    allBtn.dataset.unit = 'all';
    unitTabsEl.appendChild(allBtn);

    units.forEach((u) => {
      const btn = document.createElement('button');
      btn.className = 'unit-tab';
      btn.textContent = 'Unit ' + u.unit;
      btn.dataset.unit = String(u.unit);
      unitTabsEl.appendChild(btn);
    });

    unitTabsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.unit-tab');
      if (!btn) return;
      currentUnit = btn.dataset.unit === 'all' ? 'all' : Number(btn.dataset.unit);
      searchBoxEl.value = '';
      render();
    });
  }

  function updateActiveTab() {
    [...unitTabsEl.children].forEach((btn) => {
      const isAll = btn.dataset.unit === 'all';
      const active = isAll ? currentUnit === 'all' : Number(btn.dataset.unit) === currentUnit;
      btn.classList.toggle('active', active);
    });
  }

  function entryCard(entry, idx, query) {
    const notesHtml = (entry.notes || []).length
      ? `<div class="word-notes">${entry.notes.map((n) => `<div>${escapeHtml(n)}</div>`).join('')}</div>`
      : '';

    const examplesHtml = (entry.examples || []).map((ex) => `
      <div class="example">
        <div class="en">${highlight(ex.en, query)}</div>
        <div class="zh">${highlight(ex.zh, query)}</div>
      </div>
    `).join('');

    return `
      <article class="word-card">
        <div class="word-head">
          <span class="word-idx">${idx}.</span>
          <span class="word-en">${highlight(entry.word, query)}</span>
          <span class="word-phonetic">${escapeHtml(entry.phonetic || '')}</span>
          <span class="word-pos">${escapeHtml(entry.pos || '')}</span>
          <span class="word-meaning">${highlight(entry.meaning || '', query)}</span>
        </div>
        ${notesHtml}
        <div class="examples ${showExamples ? '' : 'hidden'}">${examplesHtml}</div>
      </article>
    `;
  }

  function matches(entry, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    if (entry.word.toLowerCase().includes(q)) return true;
    if ((entry.meaning || '').toLowerCase().includes(q)) return true;
    if ((entry.examples || []).some((ex) => ex.en.toLowerCase().includes(q) || ex.zh.includes(query))) return true;
    return false;
  }

  function render() {
    updateActiveTab();
    const query = searchBoxEl.value.trim();
    let html = '';
    let total = 0;

    const unitsToShow = currentUnit === 'all' ? units : units.filter((u) => u.unit === currentUnit);

    unitsToShow.forEach((u) => {
      const filtered = u.entries.filter((e) => matches(e, query));
      if (!filtered.length) return;
      if (currentUnit === 'all' || query) {
        html += `<h2 class="unit-heading">Unit ${u.unit}</h2>`;
      }
      filtered.forEach((entry, i) => {
        const originalIdx = u.entries.indexOf(entry) + 1;
        html += entryCard(entry, originalIdx, query);
        total += 1;
      });
    });

    wordListEl.innerHTML = html;
    emptyStateEl.hidden = total > 0;
    wordCountEl.textContent = total + ' 個單字';
  }

  toggleBtn.addEventListener('click', () => {
    showExamples = !showExamples;
    toggleBtn.textContent = showExamples ? '隱藏例句' : '顯示例句';
    render();
  });

  searchBoxEl.addEventListener('input', () => {
    if (searchBoxEl.value.trim() && currentUnit !== 'all') {
      // keep current unit scope, but also allow cross-unit search visually via heading
    }
    render();
  });

  buildTabs();
  render();
})();
