(function () {
  const QUESTION_COUNT = 25;
  const BLANK = '＿＿＿＿';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Build the pool of quiz-able (entry, example) pairs for a unit:
  // only examples where the headword appears as an exact whole word.
  function buildPool(unitData) {
    const pool = [];
    unitData.entries.forEach((entry) => {
      const word = entry.word;
      const re = new RegExp('\\b' + escapeRegExp(word) + '\\b', 'i');
      (entry.examples || []).forEach((ex) => {
        if (re.test(ex.en)) {
          pool.push({ word, meaning: entry.meaning, phonetic: entry.phonetic, en: ex.en, zh: ex.zh });
        }
      });
    });
    return pool;
  }

  function pickQuestions(pool, allWords, meaningMap) {
    // Prefer one question per distinct word for variety.
    const byWord = {};
    pool.forEach((item) => {
      if (!byWord[item.word]) byWord[item.word] = [];
      byWord[item.word].push(item);
    });
    const distinctWords = shuffle(Object.keys(byWord));
    const chosen = [];
    distinctWords.forEach((w) => {
      if (chosen.length >= QUESTION_COUNT) return;
      const options = byWord[w];
      chosen.push(options[Math.floor(Math.random() * options.length)]);
    });
    // Top up with repeats if the unit doesn't have enough distinct words.
    if (chosen.length < QUESTION_COUNT) {
      const rest = shuffle(pool);
      for (const item of rest) {
        if (chosen.length >= QUESTION_COUNT) break;
        if (!chosen.includes(item)) chosen.push(item);
      }
    }
    return shuffle(chosen).slice(0, QUESTION_COUNT).map((item, i) => {
      const distractorWords = shuffle(allWords.filter((w) => w !== item.word)).slice(0, 3);
      const options = shuffle([item.word, ...distractorWords]);
      return {
        idx: i + 1,
        word: item.word,
        meaning: item.meaning,
        phonetic: item.phonetic,
        en: item.en,
        zh: item.zh,
        options,
        optionMeanings: options.map((w) => meaningMap[w] || ''),
        correctIndex: options.indexOf(item.word),
      };
    });
  }

  function blankSentence(sentence, word) {
    const re = new RegExp('\\b' + escapeRegExp(word) + '\\b', 'i');
    const safe = escapeHtml(sentence);
    // escapeHtml doesn't touch plain letters, so the regex still matches correctly.
    return safe.replace(re, '<span class="quiz-blank">' + BLANK + '</span>');
  }

  function boldSentence(sentence, word) {
    const re = new RegExp('\\b' + escapeRegExp(word) + '\\b', 'i');
    const safe = escapeHtml(sentence);
    return safe.replace(re, (m) => '<strong class="quiz-answer-word">' + m + '</strong>');
  }

  function renderQuiz(container, questions, unitNumber, onExit, onRestart) {
    const letters = ['A', 'B', 'C', 'D'];
    const html = `
      <div class="quiz-header">
        <h2>Unit ${unitNumber} 隨堂測驗</h2>
        <p class="quiz-sub">共 ${questions.length} 題，依課本原始例句出題，選出符合句意的單字。</p>
      </div>
      <form id="quizForm">
        ${questions.map((q) => `
          <div class="quiz-question" data-idx="${q.idx}">
            <div class="quiz-q-text">${q.idx}. ${blankSentence(q.en, q.word)}</div>
            <div class="quiz-options">
              ${q.options.map((opt, i) => `
                <label class="quiz-option">
                  <input type="radio" name="q${q.idx}" value="${i}">
                  <span class="quiz-opt-letter">${letters[i]}</span>
                  <span class="quiz-opt-word">${escapeHtml(opt)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}
        <div class="quiz-actions">
          <button type="submit" class="quiz-submit-btn">送出答案</button>
          <button type="button" class="quiz-exit-btn" id="quizExitBtn">返回單字列表</button>
        </div>
      </form>
    `;
    container.innerHTML = html;

    document.getElementById('quizExitBtn').addEventListener('click', onExit);

    document.getElementById('quizForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      let score = 0;
      const results = questions.map((q) => {
        const picked = form.querySelector(`input[name="q${q.idx}"]:checked`);
        const pickedIndex = picked ? Number(picked.value) : -1;
        const correct = pickedIndex === q.correctIndex;
        if (correct) score += 1;
        return { q, pickedIndex, correct };
      });
      renderResults(container, results, unitNumber, score, questions.length, onExit, onRestart);
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderResults(container, results, unitNumber, score, total, onExit, onRestart) {
    const letters = ['A', 'B', 'C', 'D'];
    const percent = Math.round((score / total) * 100);
    const html = `
      <div class="quiz-header">
        <h2>Unit ${unitNumber} 測驗結果</h2>
        <p class="quiz-score">得分：${score} / ${total}（${percent} 分）</p>
      </div>
      <div class="quiz-actions quiz-actions-top">
        <button type="button" class="quiz-submit-btn" id="quizRestartBtn">重新測驗</button>
        <button type="button" class="quiz-exit-btn" id="quizExitBtn2">返回單字列表</button>
      </div>
      <div class="quiz-review">
        ${results.map(({ q, pickedIndex, correct }) => `
          <div class="quiz-question quiz-review-item ${correct ? 'is-correct' : 'is-wrong'}">
            <div class="quiz-q-text">
              ${q.idx}. ${correct ? '✅' : '❌'} ${blankSentence(q.en, q.word)}
            </div>
            <div class="quiz-options quiz-options-readonly">
              ${q.options.map((opt, i) => {
                let cls = 'quiz-option quiz-option-readonly';
                if (i === q.correctIndex) cls += ' opt-correct';
                if (i === pickedIndex && !correct) cls += ' opt-wrong-pick';
                return `<div class="${cls}">
                  <span class="quiz-opt-letter">${letters[i]}</span>
                  <span class="quiz-opt-word-wrap">
                    <span class="quiz-opt-word">${escapeHtml(opt)}</span>
                    <span class="quiz-opt-meaning">${escapeHtml(q.optionMeanings[i] || '')}</span>
                  </span>
                </div>`;
              }).join('')}
            </div>
            <div class="quiz-explain">
              <div class="quiz-explain-en">${boldSentence(q.en, q.word)}</div>
              <div class="quiz-explain-zh">${escapeHtml(q.zh)}</div>
              <div class="quiz-explain-meaning">
                <strong>${escapeHtml(q.word)}</strong>
                <span class="quiz-explain-phonetic">${escapeHtml(q.phonetic || '')}</span>
                ${pickedIndex === -1 ? '<span class="quiz-unanswered">（未作答）</span>' : ''}
                ： ${escapeHtml(q.meaning)}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="quiz-actions">
        <button type="button" class="quiz-submit-btn" id="quizRestartBtn2">重新測驗</button>
        <button type="button" class="quiz-exit-btn" id="quizExitBtn3">返回單字列表</button>
      </div>
    `;
    container.innerHTML = html;
    ['quizExitBtn2', 'quizExitBtn3'].forEach((id) => document.getElementById(id).addEventListener('click', onExit));
    ['quizRestartBtn', 'quizRestartBtn2'].forEach((id) => document.getElementById(id).addEventListener('click', onRestart));
  }

  function start(unitNumber, container, onExit) {
    const unitData = VocabApp.units.find((u) => u.unit === unitNumber);
    if (!unitData) return;
    const pool = buildPool(unitData);
    const allWords = [...new Set(unitData.entries.map((e) => e.word))];
    const meaningMap = {};
    unitData.entries.forEach((e) => { meaningMap[e.word] = e.meaning; });

    if (pool.length < 4 || allWords.length < 4) {
      container.innerHTML = '<p class="quiz-empty">這個 Unit 的例句不足以出題，請稍後再試。</p>';
      return;
    }

    const questions = pickQuestions(pool, allWords, meaningMap);
    const restart = () => start(unitNumber, container, onExit);
    renderQuiz(container, questions, unitNumber, onExit, restart);
    window.scrollTo(0, 0);
  }

  window.VocabQuiz = { start };
})();
