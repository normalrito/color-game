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

const state = {
  score: 0,
  choiceCount: 2,
  target: colors[0],
  sound: true,
  waiting: false,
  nextTimer: null,
  started: false,
};

const titleScreen = document.querySelector("#titleScreen");
const gameScreen = document.querySelector("#gameScreen");
const startButton = document.querySelector("#startButton");
const targetCard = document.querySelector("#targetCard");
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

function pickRoundColors() {
  const selected = shuffle(colors).slice(0, state.choiceCount);
  state.target = selected[Math.floor(Math.random() * selected.length)];
  return shuffle(selected);
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

function renderRound() {
  state.waiting = false;
  window.clearTimeout(state.nextTimer);
  targetCard.classList.remove("correct");
  updateChoiceColumns();

  const roundColors = pickRoundColors();
  targetCard.style.backgroundColor = state.target.value;
  targetName.textContent = state.target.name;
  targetCard.setAttribute("aria-label", `찾아야 할 색깔 ${state.target.name}`);
  choices.innerHTML = "";

  roundColors.forEach((color) => {
    const button = document.createElement("button");
    button.className = "choice";
    button.type = "button";
    button.style.backgroundColor = color.value;
    button.setAttribute("aria-label", color.name);
    button.addEventListener("click", (event) => checkAnswer(color, event.currentTarget));
    choices.append(button);
  });

  if (state.started) {
    speak(`${state.target.name}을 찾아요`);
  }
}

function checkAnswer(color, selectedButton) {
  if (state.waiting) return;

  const isCorrect = color.name === state.target.name;
  if (isCorrect) {
    state.waiting = true;
    state.score += 1;
    score.textContent = state.score;
    selectedButton.classList.add("correct");
    targetCard.classList.add("correct");
    playCorrectSound();
    speak("잘했어요");
    state.nextTimer = window.setTimeout(renderRound, 950);
    return;
  }

  selectedButton.classList.remove("wrong");
  selectedButton.offsetWidth;
  selectedButton.classList.add("wrong");
  playWrongSound();
  window.setTimeout(() => selectedButton.classList.remove("wrong"), 450);
}

function updateLevel(nextCount) {
  state.choiceCount = Math.min(12, Math.max(2, nextCount));
  levelLabel.textContent = `${state.choiceCount}개`;
  levelDown.disabled = state.choiceCount === 2;
  levelUp.disabled = state.choiceCount === 12;
  renderRound();
}

function resetGame() {
  state.score = 0;
  score.textContent = state.score;
  renderRound();
}

levelDown.addEventListener("click", () => updateLevel(state.choiceCount - 1));
levelUp.addEventListener("click", () => updateLevel(state.choiceCount + 1));
resetButton.addEventListener("click", resetGame);
nextButton.addEventListener("click", renderRound);
startButton.addEventListener("click", () => {
  state.started = true;
  titleScreen.hidden = true;
  gameScreen.hidden = false;
  renderRound();
});
soundToggle.addEventListener("click", () => {
  state.sound = !state.sound;
  soundToggle.textContent = state.sound ? "소리 켬" : "소리 끔";
  soundToggle.setAttribute("aria-pressed", String(state.sound));
  if (!state.sound && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
});
window.addEventListener("resize", updateChoiceColumns);

updateLevel(state.choiceCount);
