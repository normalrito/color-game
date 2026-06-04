const colors = [
  { name: "빨간색", value: "#e53935" },
  { name: "파란색", value: "#1e88e5" },
  { name: "노란색", value: "#fdd835" },
  { name: "초록색", value: "#43a047" },
  { name: "보라색", value: "#8e24aa" },
  { name: "주황색", value: "#fb8c00" },
  { name: "분홍색", value: "#f06292" },
  { name: "하늘색", value: "#4fc3f7" },
  { name: "갈색", value: "#8d6e63" },
  { name: "검은색", value: "#2f3437" },
  { name: "흰색", value: "#f8f8f8" },
  { name: "회색", value: "#9e9e9e" },
];

const gameLabels = {
  matchOne: "같은 색깔 찾기",
  findAll: "같은 색 모두 찾기",
  tapCount: "숫자만큼 누르기",
  mixColors: "색 섞기 퀴즈",
};

const mixRecipes = [
  { a: "빨간색", b: "노란색", result: "주황색" },
  { a: "파란색", b: "노란색", result: "초록색" },
  { a: "빨간색", b: "파란색", result: "보라색" },
  { a: "흰색", b: "빨간색", result: "분홍색" },
  { a: "흰색", b: "검은색", result: "회색" },
];

const state = {
  score: 0,
  choiceCount: 2,
  target: colors[0],
  sound: true,
  waiting: false,
  nextTimer: null,
  started: false,
  game: "matchOne",
  remainingTargets: 0,
  tapGoal: 0,
  tapCount: 0,
  mixRecipe: mixRecipes[0],
  mixRevealed: false,
};

const titleScreen = document.querySelector("#titleScreen");
const menuScreen = document.querySelector("#menuScreen");
const gameScreen = document.querySelector("#gameScreen");
const startButton = document.querySelector("#startButton");
const gameButtons = document.querySelectorAll(".game-select");
const gameTitle = document.querySelector("#gameTitle");
const prompt = document.querySelector("#prompt");
const targetWrap = document.querySelector(".target-wrap");
const targetCard = document.querySelector("#targetCard");
const mixLayer = document.querySelector("#mixLayer");
const mixColorA = document.querySelector("#mixColorA");
const mixColorB = document.querySelector("#mixColorB");
const mixResult = document.querySelector("#mixResult");
const targetCount = document.querySelector("#targetCount");
const targetName = document.querySelector("#targetName");
const choices = document.querySelector("#choices");
const score = document.querySelector("#score");
const levelLabel = document.querySelector("#levelLabel");
const levelDown = document.querySelector("#levelDown");
const levelUp = document.querySelector("#levelUp");
const resetButton = document.querySelector("#resetButton");
const soundToggle = document.querySelector("#soundToggle");
const nextButton = document.querySelector("#nextButton");
let audioContext;

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function findColor(name) {
  return colors.find((color) => color.name === name);
}

function speak(text) {
  if (!state.sound || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ko-KR";
  utterance.rate = 0.9;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}

function playTone(frequency, startTime, duration, type = "sine", volume = 0.18) {
  if (!state.sound) return;

  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

function playCorrectSound() {
  if (!state.sound) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const now = audioContext.currentTime;
  playTone(523.25, now, 0.16, "triangle");
  playTone(659.25, now + 0.14, 0.16, "triangle");
  playTone(783.99, now + 0.28, 0.24, "triangle");
}

function playWrongSound() {
  if (!state.sound) return;
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  const now = audioContext.currentTime;
  playTone(220, now, 0.16, "square", 0.1);
  playTone(164.81, now + 0.15, 0.22, "square", 0.1);
}

function updateChoiceColumns() {
  const columns = state.choiceCount <= 4 ? 2 : state.choiceCount <= 9 ? 3 : 4;
  const rows = Math.ceil(state.choiceCount / columns);
  const isNarrowScreen = window.matchMedia("(max-width: 780px)").matches;

  choices.style.setProperty("--choice-columns", columns);

  if (isNarrowScreen) {
    const gap = 10;
    const widthBasedSize = (window.innerWidth * 0.78 - gap * (columns - 1)) / columns;
    const heightBasedSize = (window.innerHeight * 0.34 - gap * (rows - 1)) / rows;
    const maxSize = state.choiceCount <= 4 ? 82 : state.choiceCount <= 9 ? 72 : 64;
    const size = Math.max(46, Math.min(widthBasedSize, heightBasedSize, maxSize));
    choices.style.setProperty("--choice-size", `${Math.floor(size)}px`);
  } else {
    choices.style.removeProperty("--choice-size");
  }
}

function fitGameTitle() {
  if (gameScreen.hidden) return;

  gameTitle.style.fontSize = "";
  const titleWrap = gameTitle.parentElement;
  let size = parseFloat(window.getComputedStyle(gameTitle).fontSize);

  while (gameTitle.scrollWidth > titleWrap.clientWidth && size > 16) {
    size -= 1;
    gameTitle.style.fontSize = `${size}px`;
  }
}

function setTarget(color, countText = "") {
  state.target = color;
  targetWrap.classList.remove("mix-active");
  targetCard.classList.remove("mix-card", "mix-revealed");
  mixLayer.hidden = true;
  targetCard.style.backgroundColor = color.value;
  targetName.textContent = countText ? `${color.name} ${countText}` : color.name;
  targetCard.setAttribute("aria-label", `찾아야 할 색깔 ${color.name}`);
  targetCount.hidden = !countText;
  targetCount.textContent = countText;
}

function setMixTarget(recipe, revealed = false) {
  const colorA = findColor(recipe.a);
  const colorB = findColor(recipe.b);
  const result = findColor(recipe.result);

  state.target = result;
  targetWrap.classList.add("mix-active");
  targetCard.classList.add("mix-card");
  targetCard.style.backgroundColor = "transparent";
  targetCard.style.setProperty("--mix-a", colorA.value);
  targetCard.style.setProperty("--mix-b", colorB.value);
  targetCard.style.setProperty("--mix-result", result.value);
  targetCard.classList.toggle("mix-revealed", revealed);
  targetCard.setAttribute("aria-label", `${recipe.a}과 ${recipe.b} 섞기`);
  mixLayer.hidden = false;
  mixColorA.style.backgroundColor = colorA.value;
  mixColorB.style.backgroundColor = colorB.value;
  mixResult.style.backgroundColor = result.value;
  targetCount.hidden = true;
  targetName.textContent = revealed ? result.name : `${recipe.a} + ${recipe.b}`;
}

function makeChoice(color, isTarget) {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    color,
    isTarget,
  };
}

function buildMatchOneRound() {
  const selected = shuffle(colors).slice(0, state.choiceCount);
  const target = selected[Math.floor(Math.random() * selected.length)];
  setTarget(target);
  prompt.textContent = "같은 색깔을 찾아요";
  return shuffle(selected.map((color) => makeChoice(color, color.name === target.name)));
}

function buildFindAllRound() {
  const target = shuffle(colors)[0];
  const maxTargets = state.choiceCount;
  const targetTotal = randomInt(1, maxTargets);
  const distractors = shuffle(colors.filter((color) => color.name !== target.name));
  const round = [];

  for (let index = 0; index < targetTotal; index += 1) {
    round.push(makeChoice(target, true));
  }

  for (let index = round.length; index < state.choiceCount; index += 1) {
    round.push(makeChoice(distractors[index % distractors.length], false));
  }

  state.remainingTargets = targetTotal;
  setTarget(target);
  prompt.textContent = `${target.name}을 모두 찾아요`;
  targetName.textContent = `${target.name} ${targetTotal}개`;
  return shuffle(round);
}

function buildTapCountRound() {
  const selected = shuffle(colors).slice(0, state.choiceCount);
  const target = selected[Math.floor(Math.random() * selected.length)];
  const maxGoal = Math.min(5, Math.max(2, Math.ceil(state.choiceCount / 2)));
  state.tapGoal = randomInt(1, maxGoal);
  state.tapCount = 0;
  setTarget(target, String(state.tapGoal));
  prompt.textContent = `${target.name}을 ${state.tapGoal}번 눌러요`;
  return shuffle(selected.map((color) => makeChoice(color, color.name === target.name)));
}

function buildMixRound() {
  const recipe = shuffle(mixRecipes)[0];
  state.mixRecipe = recipe;
  state.mixRevealed = false;
  return buildMixChoices(recipe);
}

function buildMixChoices(recipe) {
  const result = findColor(recipe.result);
  const distractors = shuffle(colors.filter((color) => color.name !== result.name));

  setMixTarget(recipe, false);

  if (state.choiceCount <= 1) {
    prompt.textContent = "두 색을 섞어 봐요";
    return [];
  }

  prompt.textContent = "섞으면 어떤 색일까요?";
  return shuffle([
    makeChoice(result, true),
    ...distractors.slice(0, state.choiceCount - 1).map((color) => makeChoice(color, false)),
  ]);
}

function buildRound() {
  if (state.game === "findAll") return buildFindAllRound();
  if (state.game === "tapCount") return buildTapCountRound();
  if (state.game === "mixColors") return buildMixRound();
  return buildMatchOneRound();
}

function renderChoices(roundChoices) {
  choices.innerHTML = "";

  roundChoices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "choice";
    button.type = "button";
    button.style.backgroundColor = choice.color.value;
    button.setAttribute("aria-label", choice.color.name);
    button.addEventListener("click", () => checkAnswer(choice, button));
    choices.append(button);
  });
}

function renderRound() {
  state.waiting = false;
  window.clearTimeout(state.nextTimer);
  targetCard.classList.remove("correct");
  targetCount.hidden = true;
  updateChoiceColumns();

  renderChoices(buildRound());
  fitGameTitle();

  if (state.started) {
    speak(prompt.textContent);
  }
}

function completeRound() {
  state.waiting = true;
  state.score += 1;
  score.textContent = state.score;
  targetCard.classList.add("correct");
  playCorrectSound();
  speak("잘했어요");
  state.nextTimer = window.setTimeout(renderRound, 950);
}

function revealMixResult() {
  state.mixRevealed = true;
  setMixTarget(state.mixRecipe, true);
  prompt.textContent = `${state.target.name}이 되었어요`;
  playCorrectSound();
  speak(prompt.textContent);
}

function markWrong(button) {
  button.classList.remove("wrong");
  button.offsetWidth;
  button.classList.add("wrong");
  playWrongSound();
  window.setTimeout(() => button.classList.remove("wrong"), 450);
}

function checkMatchOne(choice, button) {
  if (!choice.isTarget) {
    markWrong(button);
    return;
  }

  button.classList.add("correct");
  completeRound();
}

function checkFindAll(choice, button) {
  if (!choice.isTarget) {
    markWrong(button);
    return;
  }

  if (button.classList.contains("found")) return;
  button.classList.add("found");
  state.remainingTargets -= 1;
  playCorrectSound();

  if (state.remainingTargets <= 0) {
    completeRound();
    return;
  }

  prompt.textContent = `${state.target.name} ${state.remainingTargets}개 남았어요`;
  speak(prompt.textContent);
}

function checkTapCount(choice, button) {
  if (!choice.isTarget) {
    markWrong(button);
    return;
  }

  state.tapCount += 1;
  button.classList.remove("correct");
  button.offsetWidth;
  button.classList.add("correct");
  playCorrectSound();
  prompt.textContent = `${state.tapCount} / ${state.tapGoal}`;
  targetCount.textContent = `${state.tapGoal - state.tapCount}`;

  if (state.tapCount >= state.tapGoal) {
    completeRound();
  }
}

function checkMixColors(choice, button) {
  if (!choice.isTarget) {
    markWrong(button);
    return;
  }

  button.classList.add("correct");
  revealMixResult();
  completeRound();
}

function checkAnswer(choice, button) {
  if (state.waiting) return;

  if (state.game === "findAll") {
    checkFindAll(choice, button);
    return;
  }

  if (state.game === "tapCount") {
    checkTapCount(choice, button);
    return;
  }

  if (state.game === "mixColors") {
    checkMixColors(choice, button);
    return;
  }

  checkMatchOne(choice, button);
}

function updateLevel(nextCount) {
  const minChoices = state.game === "findAll" ? 3 : state.game === "mixColors" ? 0 : 2;
  let nextChoiceCount = nextCount;

  if (state.game === "mixColors") {
    if (nextCount === 1 && state.choiceCount === 0) nextChoiceCount = 2;
    else if (nextCount === 1 && state.choiceCount === 2) nextChoiceCount = 0;
    else if (nextCount === 1) nextChoiceCount = 2;
  }

  state.choiceCount = Math.min(12, Math.max(minChoices, nextChoiceCount));
  levelLabel.textContent = `${state.choiceCount}개`;
  levelDown.disabled = state.choiceCount === minChoices;
  levelUp.disabled = state.choiceCount === 12;

  if (state.started && state.game === "mixColors") {
    state.mixRevealed = false;
    updateChoiceColumns();
    renderChoices(buildMixChoices(state.mixRecipe));
    fitGameTitle();
  } else if (state.started) {
    renderRound();
  } else {
    updateChoiceColumns();
  }
}

function resetGame() {
  state.score = 0;
  score.textContent = state.score;
  renderRound();
}

function handleNext() {
  if (state.game === "mixColors" && state.choiceCount <= 1 && !state.mixRevealed) {
    revealMixResult();
    return;
  }

  renderRound();
}

function startGame(game) {
  state.game = game;
  if (state.game === "findAll" && state.choiceCount < 3) {
    state.choiceCount = 3;
  }
  if (state.game === "mixColors" && state.choiceCount === 1) {
    state.choiceCount = 0;
  }
  levelLabel.textContent = `${state.choiceCount}개`;
  levelDown.disabled = state.choiceCount === (state.game === "findAll" ? 3 : state.game === "mixColors" ? 0 : 2);
  levelUp.disabled = state.choiceCount === 12;
  state.started = true;
  state.score = 0;
  score.textContent = state.score;
  gameTitle.textContent = gameLabels[game];
  titleScreen.hidden = true;
  menuScreen.hidden = true;
  gameScreen.hidden = false;
  requestAnimationFrame(() => {
    fitGameTitle();
    renderRound();
  });
}

levelDown.addEventListener("click", () => updateLevel(state.choiceCount - 1));
levelUp.addEventListener("click", () => updateLevel(state.choiceCount + 1));
resetButton.addEventListener("click", resetGame);
nextButton.addEventListener("click", handleNext);
startButton.addEventListener("click", () => {
  titleScreen.hidden = true;
  menuScreen.hidden = false;
});
gameButtons.forEach((button) => {
  button.addEventListener("click", () => startGame(button.dataset.game));
});
soundToggle.addEventListener("click", () => {
  state.sound = !state.sound;
  soundToggle.setAttribute("aria-pressed", String(state.sound));
  soundToggle.setAttribute("aria-label", state.sound ? "소리 켜짐" : "소리 꺼짐");
  soundToggle.classList.toggle("is-sound-on", state.sound);
  soundToggle.classList.toggle("is-sound-off", !state.sound);
  if (!state.sound && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
});
window.addEventListener("resize", () => {
  updateChoiceColumns();
  fitGameTitle();
});

updateLevel(state.choiceCount);
