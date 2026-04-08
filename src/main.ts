import { Game } from "./game/Game";
import type { GameMode, ObstacleType } from "./game/Game";
import { Sound } from "./game/Sound";

const titleScreen = document.getElementById("title-screen") as HTMLDivElement;
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const playBtn = document.getElementById("play-btn") as HTMLButtonElement;
const freeToggleRow = document.getElementById("free-toggle-row") as HTMLDivElement;
const freeToggle = document.getElementById("free-toggle") as HTMLDivElement;

const sound = new Sound();

// 状態管理
let gameMode: GameMode = "drawing";
let selectedObstacles = new Set<ObstacleType>();
let speedStep = 1;
let restitutionStep = 2;
let tsumikiFreeMode = false;

// localStorage から設定を復元します
try {
  const saved = localStorage.getItem("b-dama-settings");
  if (saved) {
    const data = JSON.parse(saved) as { speedStep?: number; restitutionStep?: number };
    if (typeof data.speedStep === "number" && data.speedStep >= 0 && data.speedStep < 4) {
      speedStep = data.speedStep;
    }
    if (typeof data.restitutionStep === "number" && data.restitutionStep >= 0 && data.restitutionStep < 4) {
      restitutionStep = data.restitutionStep;
    }
  }
} catch { /* ignore */ }

// 初期表示を設定値に合わせます
function syncSettingsUI(): void {
  document.querySelectorAll('[data-setting="speed"] .step-btn').forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-step") === String(speedStep));
  });
  document.querySelectorAll('[data-setting="restitution"] .step-btn').forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-step") === String(restitutionStep));
  });
}
syncSettingsUI();

// モード選択
document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    sound.tap();
    gameMode = btn.getAttribute("data-mode") as GameMode;
    document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    titleScreen.classList.toggle("tsumiki", gameMode === "tsumiki");
    freeToggleRow.classList.toggle("visible", gameMode === "tsumiki");
  });
});

// 障害物カード選択
document.querySelectorAll(".obstacle-card").forEach((card) => {
  card.addEventListener("click", () => {
    sound.tap();
    const type = card.getAttribute("data-type") as ObstacleType;
    if (selectedObstacles.has(type)) {
      selectedObstacles.delete(type);
      card.classList.remove("selected");
    } else {
      selectedObstacles.add(type);
      card.classList.add("selected");
    }
  });
});

// ステップセレクター
document.querySelectorAll(".step-buttons").forEach((group) => {
  group.querySelectorAll(".step-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      sound.tap();
      const setting = group.getAttribute("data-setting");
      const step = parseInt(btn.getAttribute("data-step") ?? "0", 10);

      group.querySelectorAll(".step-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      if (setting === "speed") {
        speedStep = step;
      } else if (setting === "restitution") {
        restitutionStep = step;
      }

      try {
        localStorage.setItem("b-dama-settings", JSON.stringify({ speedStep, restitutionStep }));
      } catch { /* ignore */ }
    });
  });
});

// じゆうトグル
freeToggle.addEventListener("click", () => {
  sound.tap();
  tsumikiFreeMode = !tsumikiFreeMode;
  freeToggle.classList.toggle("on", tsumikiFreeMode);
});

// あそぶボタン
playBtn.addEventListener("click", () => {
  sound.tap();

  // タイトル画面を非表示、Canvas を表示
  titleScreen.style.display = "none";
  canvas.style.display = "block";

  // ゲーム開始
  const game = new Game(canvas);
  game.startWithConfig({
    gameMode,
    selectedObstacles: new Set(selectedObstacles),
    speedStep,
    restitutionStep,
    tsumikiFreeMode,
    onReturnToTitle: () => {
      canvas.style.display = "none";
      titleScreen.style.display = "flex";
    },
  });
});
