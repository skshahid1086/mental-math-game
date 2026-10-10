(() => {
  const roundLength = 60;
  const operations = ["+", "-", "×", "÷"];
  const difficultySettings = {
    easy: { max: 20, multiplyMin: 2, multiplyMax: 12, divideMax: 12 },
    medium: { max: 99, multiplyMin: 2, multiplyMax: 20, divideMax: 20 },
    hard: { max: 999, multiplyMin: 10, multiplyMax: 99, divideMax: 99 }
  };
  const elements = {
    best: document.getElementById("bestScore"),
    left: document.getElementById("leftOperand"),
    right: document.getElementById("rightOperand"),
    operator: document.getElementById("operator"),
    prompt: document.getElementById("promptLabel"),
    answer: document.getElementById("answerInput"),
    answerForm: document.getElementById("answerForm"),
    submit: document.getElementById("submitButton"),
    feedback: document.getElementById("feedback"),
    timer: document.getElementById("timer"),
    timerFill: document.getElementById("timerFill"),
    score: document.getElementById("score"),
    streak: document.getElementById("streak"),
    correct: document.getElementById("correct"),
    missed: document.getElementById("missed"),
    start: document.getElementById("startButton"),
    pause: document.getElementById("pauseButton")
  };

  let phase = "ready";
  let difficulty = "easy";
  let selectedOperations = new Set(operations);
  let currentAnswer = null;
  let score = 0;
  let streak = 0;
  let correct = 0;
  let missed = 0;
  let endsAt = 0;
  let pausedAt = 0;
  let ticker = null;
  let best = loadBest();

  function loadBest() {
    try { return Number(localStorage.getItem("quick-think-best") || 0); }
    catch { return 0; }
  }

  function saveBest(value) {
    try { localStorage.setItem("quick-think-best", String(value)); }
    catch {}
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function makeProblem() {
    const settings = difficultySettings[difficulty];
    const choices = [...selectedOperations];
    const operation = choices[randomInt(0, choices.length - 1)];
    let left;
    let right;
    let answer;

    if (operation === "+") {
      left = randomInt(1, settings.max);
      right = randomInt(1, settings.max);
      answer = left + right;
    } else if (operation === "-") {
      left = randomInt(1, settings.max);
      right = randomInt(1, settings.max);
      if (right > left) [left, right] = [right, left];
      answer = left - right;
    } else if (operation === "×") {
      left = randomInt(settings.multiplyMin, settings.multiplyMax);
      right = randomInt(settings.multiplyMin, settings.multiplyMax);
      answer = left * right;
    } else {
      right = randomInt(2, difficulty === "easy" ? 12 : difficulty === "medium" ? 15 : 20);
      answer = randomInt(2, settings.divideMax);
      left = right * answer;
    }

    currentAnswer = answer;
    elements.left.textContent = left;
    elements.right.textContent = right;
    elements.operator.textContent = operation;
  }

  function setFeedback(message, tone = "") {
    elements.feedback.textContent = message;
    elements.feedback.className = `feedback${tone ? ` ${tone}` : ""}`;
  }

  function updateStats() {
    elements.score.textContent = score;
    elements.streak.textContent = streak;
    elements.correct.textContent = correct;
    elements.missed.textContent = missed;
    elements.best.textContent = best;
  }

  function updateClock() {
    const secondsLeft = phase === "paused"
      ? pausedAt
      : Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    elements.timer.textContent = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;
    elements.timer.classList.toggle("urgent", secondsLeft <= 10);
    elements.timerFill.classList.toggle("urgent", secondsLeft <= 10);
    elements.timerFill.style.transform = `scaleX(${secondsLeft / roundLength})`;
    if (phase === "running" && secondsLeft <= 0) finishRound();
  }

  function setSettingsDisabled(disabled) {
    document.querySelectorAll("#difficultyControls button, #operationControls button")
      .forEach(button => { button.disabled = disabled; });
  }

  function startRound() {
    if (phase === "running") return;
    clearInterval(ticker);
    phase = "running";
    score = 0;
    streak = 0;
    correct = 0;
    missed = 0;
    endsAt = Date.now() + roundLength * 1000;
    elements.answer.disabled = false;
    elements.submit.disabled = false;
    elements.pause.disabled = false;
    elements.pause.textContent = "Pause";
    elements.start.textContent = "Restart";
    elements.prompt.textContent = "Solve this one";
    setSettingsDisabled(true);
    setFeedback("Go go go!");
    makeProblem();
    updateStats();
    updateClock();
    elements.answer.value = "";
    elements.answer.focus();
    ticker = setInterval(updateClock, 150);
  }

  function finishRound() {
    if (phase === "over") return;
    clearInterval(ticker);
    phase = "over";
    elements.answer.disabled = true;
    elements.submit.disabled = true;
    elements.pause.disabled = true;
    elements.start.textContent = "Play again";
    elements.prompt.textContent = "Round complete";
    currentAnswer = null;
    if (score > best) {
      best = score;
      saveBest(best);
      setFeedback(`New personal best! ${score} points.`, "good");
    } else {
      setFeedback(`${score} points. Fancy another round?`, "good");
    }
    updateStats();
    updateClock();
  }

  function submitAnswer(event) {
    event.preventDefault();
    if (phase !== "running" || currentAnswer === null) return;
    const value = elements.answer.value.trim();
    if (value === "" || !/^-?\d+$/.test(value)) {
      setFeedback("Enter a whole number to answer.", "bad");
      elements.answer.focus();
      return;
    }

    if (Number(value) === currentAnswer) {
      correct += 1;
      streak += 1;
      score += 10 + (streak % 5 === 0 ? 5 : 0);
      setFeedback(streak % 5 === 0 ? "Five in a row! +15 points" : "That's right! +10 points", "good");
    } else {
      missed += 1;
      streak = 0;
      setFeedback("Not quite. Keep moving!", "bad");
    }
    updateStats();
    makeProblem();
    elements.answer.value = "";
    elements.answer.focus();
  }

  function togglePause() {
    if (phase === "running") {
      pausedAt = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      phase = "paused";
      clearInterval(ticker);
      elements.answer.disabled = true;
      elements.submit.disabled = true;
      elements.pause.textContent = "Resume";
      elements.prompt.textContent = "Take your time";
      setFeedback("Round paused", "paused");
      updateClock();
    } else if (phase === "paused") {
      endsAt = Date.now() + pausedAt * 1000;
      phase = "running";
      elements.answer.disabled = false;
      elements.submit.disabled = false;
      elements.pause.textContent = "Pause";
      elements.prompt.textContent = "Solve this one";
      setFeedback("Back at it!");
      elements.answer.focus();
      ticker = setInterval(updateClock, 150);
    }
  }

  document.getElementById("difficultyControls").addEventListener("click", event => {
    const button = event.target.closest("[data-difficulty]");
    if (!button || phase === "running" || phase === "paused") return;
    difficulty = button.dataset.difficulty;
    document.querySelectorAll("[data-difficulty]").forEach(item => {
      item.setAttribute("aria-pressed", String(item === button));
    });
  });

  document.getElementById("operationControls").addEventListener("click", event => {
    const button = event.target.closest("[data-operation]");
    if (!button || phase === "running" || phase === "paused") return;
    const operation = button.dataset.operation;
    if (selectedOperations.has(operation) && selectedOperations.size > 1) {
      selectedOperations.delete(operation);
      button.setAttribute("aria-pressed", "false");
    } else if (!selectedOperations.has(operation)) {
      selectedOperations.add(operation);
      button.setAttribute("aria-pressed", "true");
    }
  });

  elements.answerForm.addEventListener("submit", submitAnswer);
  elements.start.addEventListener("click", startRound);
  elements.pause.addEventListener("click", togglePause);
  elements.best.textContent = best;
  updateClock();
})();
