import type { Shelf } from "../entities/Shelf";
import type { GoalEffect, BreakEffect, ObstacleType, GameMode } from "./Game";

const COLORS = {
  red: "#E74C3C",
  redDark: "#C0392B",
  gold: "#F39C12",
  goldLight: "#FFD93D",
  blue: "#2980B9",
  blueDark: "#1F6DA0",
  green: "#27AE60",
  cream: "#FFF8E1",
  tsumikiCream: "#E8F0FE",
  dark: "#4a2020",
  white: "#ffffff",
};

// Rainbow marble color tones: [highlight, light, mid, dark]
const MARBLE_TONES: [string, string, string, string][] = [
  ["#FF8A80", "#F44336", "#D32F2F", "#B71C1C"], // Red
  ["#FFCC80", "#FF9800", "#EF6C00", "#E65100"], // Orange
  ["#FFE082", "#FFC107", "#FF8F00", "#E65100"], // Yellow
  ["#C8E6C9", "#4CAF50", "#2E7D32", "#1B5E20"], // Green
  ["#90CAF9", "#2196F3", "#1565C0", "#0D47A1"], // Blue
  ["#B39DDB", "#7E57C2", "#512DA8", "#311B92"], // Indigo
  ["#F48FB1", "#E91E63", "#C2185B", "#880E4F"], // Violet
  ["#FFFFFF", "#F0F0F0", "#D8D8D8", "#B0B0B0"], // White
];

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private frame = 0;
  pressedPoint: { x: number; y: number } | null = null;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  private get t(): number {
    return this.frame / 60;
  }

  drawBackground(w: number, h: number, gameMode: GameMode = "drawing"): void {
    this.frame++;
    const ctx = this.ctx;

    if (gameMode === "tsumiki") {
      ctx.fillStyle = COLORS.tsumikiCream;
      ctx.fillRect(0, 0, w, h);
      // ゴールドストライプ
      ctx.globalAlpha = 0.04;
      for (let x = 0; x < w; x += 40) {
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(x, 0, 20, h);
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = COLORS.cream;
      ctx.fillRect(0, 0, w, h);
      // Circus tent stripes
      ctx.globalAlpha = 0.04;
      for (let x = 0; x < w; x += 40) {
        ctx.fillStyle = COLORS.red;
        ctx.fillRect(x, 0, 20, h);
      }
      ctx.globalAlpha = 1;
    }
  }

  drawTitleScreen(w: number, h: number, selectedObstacles: Set<ObstacleType>, speedStep?: number, restitutionStep?: number, gameMode: GameMode = "drawing", tsumikiFreeMode = false): void {
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h / 2;

    // Floating marble
    const bounce = Math.sin(this.t * 2) * 8;
    this.drawMarble(cx, cy - 230 + bounce, 35);

    // Title
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(74,32,32,0.1)";
    ctx.font = "24px 'Hachi Maru Pop', cursive";
    ctx.fillText("ビー玉", cx + 2, cy - 185);
    ctx.fillText("ころころ", cx + 2, cy - 158);
    ctx.fillStyle = COLORS.red;
    ctx.font = "24px 'Hachi Maru Pop', cursive";
    ctx.fillText("ビー玉", cx, cy - 187);
    ctx.fillText("ころころ", cx, cy - 160);

    // モード選択ボタン
    const modeY = cy - 130;
    const modeBtnW = 120;
    const modeBtnH = 36;
    const modeGap = 10;
    const drawingX = cx - modeBtnW / 2 - modeGap / 2;
    const tsumikiX = cx + modeBtnW / 2 + modeGap / 2;

    this.drawModeButton(drawingX, modeY, modeBtnW, modeBtnH, "おえかき", gameMode === "drawing");
    this.drawModeButton(tsumikiX, modeY, modeBtnW, modeBtnH, "つみき", gameMode === "tsumiki");

    // Obstacle cards - 2x3 グリッド
    const cardW = 100;
    const cardH = 64;
    const gapX = 12;
    const gapY = 8;
    const gridTop = modeY + 32;
    const types: ObstacleType[] = ["rect", "circle", "triangle", "cross", "seesaw", "ushape", "belt"];
    const labels = ["しかく", "まる", "さんかく", "くるくる", "シーソー", "ユーがた", "コンベア"];

    for (let i = 0; i < types.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cardX = cx + (col === 0 ? -(cardW / 2 + gapX / 2) : (cardW / 2 + gapX / 2));
      const cardY = gridTop + row * (cardH + gapY) + cardH / 2;
      const isSelected = selectedObstacles.has(types[i]!);
      this.drawObstacleCard(cardX, cardY, cardW, cardH, types[i]!, labels[i]!, isSelected);
    }

    const gridRows = Math.ceil(types.length / 2);
    const gridBottom = gridTop + gridRows * (cardH + gapY);

    // Play button
    const btnY = gridBottom + 20;
    if (selectedObstacles.size > 0) {
      this.drawButton(cx, btnY, 200, 50, "あそぶ", COLORS.red, COLORS.white, "play");
    } else {
      this.drawButton(cx, btnY, 200, 50, "あそぶ", "#E0E0E0", "#AAAAAA");
    }

    // Settings - 背景パネル付き
    if (speedStep !== undefined && restitutionStep !== undefined) {
      const panelTop = btnY + 34;
      const panelH = gameMode === "tsumiki" ? 105 : 78;

      // パネル背景
      ctx.beginPath();
      ctx.roundRect(cx - 140, panelTop - 6, 280, panelH, 12);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fill();

      const speedY = panelTop + 12;
      const restitutionY = speedY + 34;
      const speedLabels = ["おそい", "ふつう", "はやい", "もっと"];
      const bounceLabels = ["ぺたり", "すこし", "ふつう", "すごく"];
      this.drawStepSelector(cx, speedY, "はやさ", speedStep, speedLabels);
      this.drawStepSelector(cx, restitutionY, "はずみ", restitutionStep, bounceLabels);

      // 積み木モード: じゆうトグル
      if (gameMode === "tsumiki") {
        const freeY = restitutionY + 32;
        this.drawToggle(cx, freeY, "じゆう", tsumikiFreeMode);
      }
    }

    ctx.textAlign = "left";
  }

  private drawModeButton(x: number, y: number, w: number, h: number, label: string, isSelected: boolean): void {
    const ctx = this.ctx;
    const r = h / 2;

    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, r);

    if (isSelected) {
      ctx.fillStyle = COLORS.blue;
      ctx.fill();
      ctx.strokeStyle = COLORS.blueDark;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = COLORS.white;
    } else {
      ctx.fillStyle = COLORS.white;
      ctx.fill();
      ctx.strokeStyle = "#CCCCCC";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = COLORS.dark;
      ctx.globalAlpha = 0.6;
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 16px 'Hachi Maru Pop', cursive";
    ctx.fillText(label, x, y);
    ctx.globalAlpha = 1;
  }

  drawClearScreen(w: number, h: number, goalsScored: number, hasNextLevel: boolean): void {
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h / 2;

    // Confetti background
    for (let i = 0; i < 20; i++) {
      const confX = (Math.sin(i * 7.3 + this.t * 0.8) * 0.5 + 0.5) * w;
      const confY = ((i * 41 + this.t * 30) % (h + 40)) - 20;
      const confSize = 4 + (i % 3) * 2;
      const confColors = [COLORS.red, COLORS.gold, COLORS.blue, COLORS.green];
      ctx.fillStyle = confColors[i % confColors.length]!;
      ctx.globalAlpha = 0.4;
      ctx.save();
      ctx.translate(confX, confY);
      ctx.rotate(this.t * 2 + i);
      ctx.fillRect(-confSize / 2, -confSize / 2, confSize, confSize * 0.4);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // "Clear" with scale pulse
    const scale = 1 + Math.sin(this.t * 3) * 0.03;
    ctx.save();
    ctx.translate(cx, cy - 80);
    ctx.scale(scale, scale);
    ctx.fillStyle = COLORS.red;
    ctx.font = "48px 'Hachi Maru Pop', cursive";
    ctx.fillText("クリア！", 0, 0);
    ctx.restore();

    // Score display
    ctx.fillStyle = COLORS.gold;
    ctx.font = "56px 'Hachi Maru Pop', cursive";
    ctx.fillText(`${goalsScored}`, cx, cy - 10);

    ctx.fillStyle = COLORS.dark;
    ctx.globalAlpha = 0.6;
    ctx.font = "14px 'Hachi Maru Pop', cursive";
    ctx.fillText("こ ゴールイン！", cx, cy + 30);
    ctx.globalAlpha = 1;

    // Stars
    const star1 = goalsScored >= 1;
    const star2 = goalsScored >= 3;
    const star3 = goalsScored >= 5;
    this.drawStar(cx - 50, cy + 70, 26, star1);
    this.drawStar(cx, cy + 60, 30, star2);
    this.drawStar(cx + 50, cy + 70, 26, star3);

    if (hasNextLevel) {
      this.drawButton(cx, cy + 125, 200, 54, "つぎへ", COLORS.blue, COLORS.white, "next");
      this.drawButton(cx, cy + 190, 200, 48, "もういちど", COLORS.red, COLORS.white, "retry");
      this.drawButton(cx, cy + 250, 200, 48, "タイトルへ", COLORS.white, COLORS.dark);
    } else {
      this.drawButton(cx, cy + 125, 200, 54, "もういちど", COLORS.red, COLORS.white, "retry");
      this.drawButton(cx, cy + 190, 200, 48, "タイトルへ", COLORS.white, COLORS.dark);
    }
  }

  drawFailScreen(w: number, h: number): void {
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h / 2;

    // Sad marble
    const bounce = Math.sin(this.t * 1.5) * 4;
    this.drawMarble(cx, cy - 80 + bounce, 30);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.dark;
    ctx.globalAlpha = 0.7;
    ctx.font = "36px 'Hachi Maru Pop', cursive";
    ctx.fillText("ざんねん…", cx, cy - 30);
    ctx.globalAlpha = 1;

    ctx.font = "14px 'Hachi Maru Pop', cursive";
    ctx.fillStyle = COLORS.dark;
    ctx.globalAlpha = 0.5;
    ctx.fillText("もういちど やってみよう！", cx, cy + 15);
    ctx.globalAlpha = 1;

    this.drawButton(cx, cy + 70, 200, 54, "リトライ", COLORS.red, COLORS.white, "retry");
    this.drawButton(cx, cy + 135, 200, 48, "タイトルへ", COLORS.white, COLORS.dark);
  }

  drawMarble(x: number, y: number, r: number, colorIndex?: number, opacity = 1): void {
    const ctx = this.ctx;
    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = opacity;
    const tone = MARBLE_TONES[colorIndex ?? 2]!;

    const grad = ctx.createRadialGradient(
      x - r * 0.15,
      y - r * 0.2,
      0,
      x,
      y,
      r,
    );
    grad.addColorStop(0, tone[0]);
    grad.addColorStop(0.4, tone[1]);
    grad.addColorStop(0.7, tone[2]);
    grad.addColorStop(1, tone[3]);

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.3, r * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + r * 0.15, y + r * 0.2, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fill();

    ctx.globalAlpha = prevAlpha;
  }

  drawRainbowMarble(x: number, y: number, r: number): void {
    const ctx = this.ctx;
    const t = this.t;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 3);

    // レインボーグラデーションの円を描画します
    const rainbowColors = [
      "#F44336", "#FF9800", "#FFC107", "#4CAF50", "#2196F3", "#7E57C2", "#E91E63",
    ];

    // Conic gradient をセグメントで近似します
    const segments = rainbowColors.length;
    for (let i = 0; i < segments; i++) {
      const startAngle = (Math.PI * 2 * i) / segments;
      const endAngle = (Math.PI * 2 * (i + 1)) / segments;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = rainbowColors[i]!;
      ctx.fill();
    }

    // 中央に白いグラデーションを重ねてガラス質感を出します
    const innerGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.15, 0, 0, 0, r);
    innerGrad.addColorStop(0, "rgba(255,255,255,0.7)");
    innerGrad.addColorStop(0.4, "rgba(255,255,255,0.3)");
    innerGrad.addColorStop(0.7, "rgba(255,255,255,0.05)");
    innerGrad.addColorStop(1, "rgba(0,0,0,0.1)");
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();

    ctx.restore();

    // ハイライト（回転しない固定位置）
    ctx.beginPath();
    ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.3, r * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fill();

    // キラキラエフェクト
    const sparkleCount = 4;
    for (let i = 0; i < sparkleCount; i++) {
      const angle = t * 2 + (Math.PI * 2 * i) / sparkleCount;
      const dist = r + 4 + Math.sin(t * 5 + i * 1.5) * 3;
      const sx = x + Math.cos(angle) * dist;
      const sy = y + Math.sin(angle) * dist;
      const sparkleSize = 2 + Math.sin(t * 6 + i) * 1;
      ctx.globalAlpha = 0.5 + Math.sin(t * 6 + i * 2) * 0.3;
      ctx.fillStyle = rainbowColors[i % rainbowColors.length]!;
      ctx.beginPath();
      ctx.arc(sx, sy, sparkleSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawGoal(x: number, y: number, goalsScored = 0, introAge = 999): void {
    const ctx = this.ctx;
    const pulse = 1 + Math.sin(this.t * 3) * 0.08;
    const glowAlpha = 0.15 + Math.sin(this.t * 3) * 0.1;

    // Intro ripple effect
    if (introAge < 1.5) {
      const rippleCount = 2;
      for (let i = 0; i < rippleCount; i++) {
        const delay = i * 0.3;
        const age = introAge - delay;
        if (age > 0 && age < 1.2) {
          const progress = age / 1.2;
          const rippleR = 20 + progress * 60;
          const rippleAlpha = (1 - progress) * 0.35;
          ctx.beginPath();
          ctx.arc(x, y, rippleR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(243,156,18,${rippleAlpha})`;
          ctx.lineWidth = 3 * (1 - progress);
          ctx.stroke();
        }
      }
    }

    // Glow ring
    ctx.beginPath();
    ctx.arc(x, y, 38 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(243,156,18,${glowAlpha})`;
    ctx.fill();

    // Piano basket
    const pw = 40; // half width
    const ph = 30; // height
    const topY = y - ph * 0.3;
    const botY = y + ph * 0.5;

    // Piano body (trapezoid)
    ctx.beginPath();
    ctx.moveTo(x - pw, topY);
    ctx.lineTo(x + pw, topY);
    ctx.lineTo(x + pw * 0.8, botY);
    ctx.lineTo(x - pw * 0.8, botY);
    ctx.closePath();
    const bodyGrad = ctx.createLinearGradient(0, topY, 0, botY);
    bodyGrad.addColorStop(0, "#2C2C2C");
    bodyGrad.addColorStop(0.5, "#1A1A1A");
    bodyGrad.addColorStop(1, "#0D0D0D");
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Piano top highlight
    ctx.beginPath();
    ctx.moveTo(x - pw + 2, topY + 1);
    ctx.lineTo(x + pw - 2, topY + 1);
    ctx.lineTo(x + pw - 4, topY + 4);
    ctx.lineTo(x - pw + 4, topY + 4);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();

    // White keys
    const keysY = topY + 6;
    const keysH = (botY - topY) * 0.65;
    const keyCount = 8;
    const keysW = pw * 1.6;
    const keyW = keysW / keyCount;
    const keysStartX = x - keysW / 2;

    for (let i = 0; i < keyCount; i++) {
      const kx = keysStartX + i * keyW;
      ctx.beginPath();
      ctx.roundRect(kx + 0.5, keysY, keyW - 1, keysH, [0, 0, 2, 2]);
      ctx.fillStyle = "#F5F5F0";
      ctx.fill();
      ctx.strokeStyle = "#CCC";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Black keys
    const blackKeyPattern = [1, 1, 0, 1, 1, 1, 0]; // pattern of black keys
    const blackKeyH = keysH * 0.55;
    const blackKeyW = keyW * 0.6;
    for (let i = 0; i < keyCount - 1; i++) {
      if (!blackKeyPattern[i % blackKeyPattern.length]) continue;
      const bkx = keysStartX + (i + 1) * keyW - blackKeyW / 2;
      ctx.beginPath();
      ctx.roundRect(bkx, keysY, blackKeyW, blackKeyH, [0, 0, 2, 2]);
      const bkGrad = ctx.createLinearGradient(0, keysY, 0, keysY + blackKeyH);
      bkGrad.addColorStop(0, "#333");
      bkGrad.addColorStop(0.8, "#1A1A1A");
      bkGrad.addColorStop(1, "#0A0A0A");
      ctx.fillStyle = bkGrad;
      ctx.fill();
    }

    // Piano legs
    ctx.fillStyle = "#1A1A1A";
    ctx.fillRect(x - pw * 0.7, botY, 3, 6);
    ctx.fillRect(x + pw * 0.7 - 3, botY, 3, 6);

    // Subtle gold trim at top
    ctx.beginPath();
    ctx.moveTo(x - pw, topY);
    ctx.lineTo(x + pw, topY);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Note animation (bouncing music notes)
    const noteColors = [COLORS.gold, COLORS.red, COLORS.blue];
    for (let i = 0; i < 3; i++) {
      const noteAge = (this.t * 0.8 + i * 1.2) % 2.5;
      if (noteAge > 1.5) continue;
      const noteProgress = noteAge / 1.5;
      const noteX = x + (i - 1) * 18;
      const noteY = topY - 8 - noteProgress * 20;
      const noteAlpha = 1 - noteProgress;
      ctx.globalAlpha = noteAlpha * 0.6;
      ctx.fillStyle = noteColors[i % noteColors.length]!;
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("\u266A", noteX, noteY);
    }
    ctx.globalAlpha = 1;

    // Down arrow above piano
    const arrowY = topY - 16;
    const arrowPulse = Math.sin(this.t * 4) * 3;
    ctx.fillStyle = COLORS.gold;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(x - 8, arrowY - 6 + arrowPulse);
    ctx.lineTo(x + 8, arrowY - 6 + arrowPulse);
    ctx.lineTo(x, arrowY + 6 + arrowPulse);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = COLORS.dark;
    ctx.globalAlpha = 0.5;
    ctx.font = "10px 'Hachi Maru Pop', cursive";
    ctx.fillText("ゴール", x, botY + 10);
    ctx.globalAlpha = 1;

    // Score badge
    if (goalsScored > 0) {
      const badgeX = x + pw + 6;
      const badgeY2 = topY - 6;
      const badgeR = 14;

      ctx.beginPath();
      ctx.arc(badgeX, badgeY2, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.red;
      ctx.fill();
      ctx.strokeStyle = COLORS.white;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = COLORS.white;
      ctx.font = "bold 12px 'Hachi Maru Pop', cursive";
      ctx.fillText(`${goalsScored}`, badgeX, badgeY2);
    }
  }

  drawStart(x: number, y: number, introAge = 999): void {
    const ctx = this.ctx;
    // introAge < 0: タイマー開始前 → 常にパルス表示します
    const showPulse = introAge < 0 || introAge < 1.5;

    // Ripple effect
    if (showPulse) {
      if (introAge < 0) {
        // タイマー開始前：ループするパルスリング
        const loopAge = this.t % 1.2;
        const progress = loopAge / 1.2;
        const rippleR = 20 + progress * 40;
        const rippleAlpha = (1 - progress) * 0.25;
        ctx.beginPath();
        ctx.arc(x, y, rippleR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(231,76,60,${rippleAlpha})`;
        ctx.lineWidth = 2.5 * (1 - progress);
        ctx.stroke();
      } else {
        const rippleCount = 2;
        for (let i = 0; i < rippleCount; i++) {
          const delay = i * 0.3;
          const age = introAge - delay;
          if (age > 0 && age < 1.2) {
            const progress = age / 1.2;
            const rippleR = 15 + progress * 50;
            const rippleAlpha = (1 - progress) * 0.3;
            ctx.beginPath();
            ctx.arc(x, y, rippleR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(231,76,60,${rippleAlpha})`;
            ctx.lineWidth = 3 * (1 - progress);
            ctx.stroke();
          }
        }
      }
    }

    // Platform
    ctx.beginPath();
    ctx.roundRect(x - 34, y - 10, 68, 20, 10);
    const grad = ctx.createLinearGradient(x - 34, 0, x + 34, 0);
    grad.addColorStop(0, COLORS.gold);
    grad.addColorStop(0.5, COLORS.goldLight);
    grad.addColorStop(1, "#E67E22");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#D4740E";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Down arrow indicating drop
    const arrowY = y + 18;
    const arrowPulse = Math.sin(this.t * 3) * 3;
    ctx.fillStyle = COLORS.gold;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(x - 6, arrowY + arrowPulse);
    ctx.lineTo(x + 6, arrowY + arrowPulse);
    ctx.lineTo(x, arrowY + 10 + arrowPulse);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = COLORS.dark;
    ctx.globalAlpha = 0.5;
    ctx.font = "10px 'Hachi Maru Pop', cursive";
    ctx.fillText("スタート", x, y + 30);
    ctx.globalAlpha = 1;
  }

  drawGravityArrow(w: number, h: number): void {
    const ctx = this.ctx;
    const x = w - 20;
    const y = h / 2;

    ctx.globalAlpha = 0.2;

    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x, y + 20);
    ctx.strokeStyle = COLORS.dark;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 7, y + 14);
    ctx.lineTo(x, y + 24);
    ctx.lineTo(x + 7, y + 14);
    ctx.fillStyle = COLORS.dark;
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.lineCap = "butt";
  }

  drawDrum(x: number, y: number, w: number, h: number, hitAge = -1, angle = 0): void {
    const ctx = this.ctx;
    const HIT_DURATION = 0.3;
    const isHit = hitAge >= 0 && hitAge < HIT_DURATION;

    // 衝突時の揺れオフセット
    let shakeX = 0;
    let shakeY = 0;
    if (isHit) {
      const progress = hitAge / HIT_DURATION;
      const decay = 1 - progress;
      shakeX = Math.sin(hitAge * 60) * 3 * decay;
      shakeY = Math.cos(hitAge * 80) * 2 * decay;
    }

    ctx.save();
    ctx.translate(x + shakeX, y + shakeY);
    if (angle !== 0) ctx.rotate(angle);

    // Shadow
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 2, -h / 2 + 2, w, h, 8);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fill();

    // 衝突時は明るい色に変化します
    const topColor = isHit ? COLORS.goldLight : COLORS.red;
    const bottomColor = isHit ? COLORS.gold : COLORS.redDark;

    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 8);
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, 6, [6, 6, 0, 0]);
    ctx.fillStyle = isHit ? COLORS.white : COLORS.gold;
    ctx.fill();

    ctx.restore();
  }

  drawBumper(x: number, y: number, r: number, hitAge = -1): void {
    const ctx = this.ctx;
    const HIT_DURATION = 0.3;
    const isHit = hitAge >= 0 && hitAge < HIT_DURATION;

    // 衝突時のスケール変化
    let scale = 1;
    if (isHit) {
      const progress = hitAge / HIT_DURATION;
      scale = 1 + Math.sin(progress * Math.PI) * 0.2;
    }

    const dr = r * scale;

    // Shadow
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, dr, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fill();

    // Body gradient
    const baseColor = isHit ? COLORS.goldLight : COLORS.blue;
    const darkColor = isHit ? COLORS.gold : COLORS.blueDark;
    const grad = ctx.createRadialGradient(x - dr * 0.2, y - dr * 0.2, 0, x, y, dr);
    grad.addColorStop(0, isHit ? COLORS.white : "#90CAF9");
    grad.addColorStop(0.5, baseColor);
    grad.addColorStop(1, darkColor);

    ctx.beginPath();
    ctx.arc(x, y, dr, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Border
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Highlight
    ctx.beginPath();
    ctx.ellipse(x - dr * 0.2, y - dr * 0.25, dr * 0.35, dr * 0.2, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();

    // Bounce arrows
    if (!isHit) {
      const arrowPulse = 0; // アニメーション無効化: Math.sin(this.t * 4) * 2
      ctx.fillStyle = COLORS.white;
      ctx.globalAlpha = 0.4;
      const arrowSize = r * 0.25;
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI * 2 * i) / 4 + Math.PI / 4;
        const ax = x + Math.cos(angle) * (dr + 6 + arrowPulse);
        const ay = y + Math.sin(angle) * (dr + 6 + arrowPulse);
        ctx.beginPath();
        ctx.moveTo(
          ax + Math.cos(angle) * arrowSize,
          ay + Math.sin(angle) * arrowSize,
        );
        ctx.lineTo(
          ax + Math.cos(angle + 2.2) * arrowSize,
          ay + Math.sin(angle + 2.2) * arrowSize,
        );
        ctx.lineTo(
          ax + Math.cos(angle - 2.2) * arrowSize,
          ay + Math.sin(angle - 2.2) * arrowSize,
        );
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  drawTriangle(x: number, y: number, size: number, hitAge = -1): void {
    const ctx = this.ctx;
    const HIT_DURATION = 0.3;
    const isHit = hitAge >= 0 && hitAge < HIT_DURATION;

    let scale = 1;
    if (isHit) {
      const progress = hitAge / HIT_DURATION;
      scale = 1 + Math.sin(progress * Math.PI) * 0.15;
    }

    const s = size * scale;
    // Matter.Bodies.polygon を -30度回転した「上を向いた正三角形」の頂点座標
    // v0: (s*√3/2, s/2)   右下
    // v1: (-s*√3/2, s/2)  左下
    // v2: (0, -s)          上
    const hw = s * Math.sqrt(3) / 2;

    // Shadow
    ctx.beginPath();
    ctx.moveTo(x + 2, y - s + 2);
    ctx.lineTo(x + hw + 2, y + s / 2 + 2);
    ctx.lineTo(x - hw + 2, y + s / 2 + 2);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fill();

    // Body
    const baseColor = isHit ? COLORS.goldLight : COLORS.green;
    const darkColor = isHit ? COLORS.gold : "#1B8C4F";
    const grad = ctx.createLinearGradient(x, y - s, x, y + s / 2);
    grad.addColorStop(0, baseColor);
    grad.addColorStop(1, darkColor);

    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + hw, y + s / 2);
    ctx.lineTo(x - hw, y + s / 2);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Border
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Highlight
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.6);
    ctx.lineTo(x + hw * 0.35, y);
    ctx.lineTo(x - hw * 0.1, y);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fill();
  }

  drawCross(x: number, y: number, size: number, angle: number, hitAge = -1): void {
    const ctx = this.ctx;
    const HIT_DURATION = 0.3;
    const isHit = hitAge >= 0 && hitAge < HIT_DURATION;

    let scale = 1;
    if (isHit) {
      const progress = hitAge / HIT_DURATION;
      scale = 1 + Math.sin(progress * Math.PI) * 0.15;
    }

    const armLen = size * scale * 2;
    const armW = size * scale * 0.4;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Shadow
    ctx.save();
    ctx.translate(2, 2);
    ctx.beginPath();
    ctx.roundRect(-armLen / 2, -armW / 2, armLen, armW, 3);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-armW / 2, -armLen / 2, armW, armLen, 3);
    ctx.fill();
    ctx.restore();

    // Body
    const baseColor = isHit ? COLORS.goldLight : "#F39C12";
    const darkColor = isHit ? COLORS.gold : "#E67E22";
    const grad = ctx.createLinearGradient(-armLen / 2, 0, armLen / 2, 0);
    grad.addColorStop(0, darkColor);
    grad.addColorStop(0.5, baseColor);
    grad.addColorStop(1, darkColor);

    // Horizontal arm
    ctx.beginPath();
    ctx.roundRect(-armLen / 2, -armW / 2, armLen, armW, 3);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#D4740E";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Vertical arm
    const vGrad = ctx.createLinearGradient(0, -armLen / 2, 0, armLen / 2);
    vGrad.addColorStop(0, darkColor);
    vGrad.addColorStop(0.5, baseColor);
    vGrad.addColorStop(1, darkColor);
    ctx.beginPath();
    ctx.roundRect(-armW / 2, -armLen / 2, armW, armLen, 3);
    ctx.fillStyle = vGrad;
    ctx.fill();
    ctx.strokeStyle = "#D4740E";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(0, 0, armW * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "#D4740E";
    ctx.fill();

    // Highlight
    ctx.beginPath();
    ctx.arc(-armW * 0.15, -armW * 0.15, armW * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fill();

    ctx.restore();
  }

  drawSeesaw(x: number, y: number, w: number, h: number, angle: number, hitAge = -1): void {
    const ctx = this.ctx;
    const HIT_DURATION = 0.3;
    const isHit = hitAge >= 0 && hitAge < HIT_DURATION;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Shadow
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 2, -h / 2 + 2, w, h, 4);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fill();

    // Board body
    const topColor = isHit ? COLORS.goldLight : "#8E6BBE";
    const bottomColor = isHit ? COLORS.gold : "#5B3A8C";
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    grad.addColorStop(0, bottomColor);
    grad.addColorStop(0.5, topColor);
    grad.addColorStop(1, bottomColor);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#4A2870";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Highlight stripe on top
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, Math.max(3, h * 0.3), [4, 4, 0, 0]);
    ctx.fillStyle = isHit ? COLORS.white : "rgba(255,255,255,0.2)";
    ctx.fill();

    ctx.restore();

    // Pivot triangle (support underneath, drawn in world space)
    ctx.save();
    ctx.translate(x, y);
    const pivotSize = Math.max(8, h * 1.5);
    ctx.beginPath();
    ctx.moveTo(-pivotSize * 0.6, pivotSize);
    ctx.lineTo(pivotSize * 0.6, pivotSize);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = "#4A2870";
    ctx.fill();
    ctx.strokeStyle = "#3A1860";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pivot circle at center
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(3, h * 0.4), 0, Math.PI * 2);
    ctx.fillStyle = isHit ? COLORS.gold : "#D4A8FF";
    ctx.fill();

    ctx.restore();
  }

  drawUShape(x: number, y: number, size: number, angle: number, hitAge = -1): void {
    const ctx = this.ctx;
    const HIT_DURATION = 0.3;
    const isHit = hitAge >= 0 && hitAge < HIT_DURATION;

    let scale = 1;
    if (isHit) {
      const progress = hitAge / HIT_DURATION;
      scale = 1 + Math.sin(progress * Math.PI) * 0.15;
    }

    // C字型の円弧。(x, y) が円の中心
    const radius = size * scale;
    const wallThick = size * scale * 0.2;
    const gap = Math.PI * 0.25; // 開口部の半角
    // 開口部を上に向けます
    const startAngle = -Math.PI / 2 + gap;
    const endAngle = -Math.PI / 2 + Math.PI * 2 - gap;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const baseColor = isHit ? "#B39DDB" : "#9C27B0";
    const darkColor = isHit ? "#9C27B0" : "#7B1FA2";

    // Shadow
    ctx.save();
    ctx.translate(2, 2);
    ctx.beginPath();
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.lineWidth = wallThick;
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();

    // Body (太い円弧)
    ctx.beginPath();
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.lineWidth = wallThick;
    ctx.strokeStyle = darkColor;
    ctx.lineCap = "round";
    ctx.stroke();

    // 内側のハイライト円弧
    ctx.beginPath();
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.lineWidth = wallThick * 0.6;
    ctx.strokeStyle = baseColor;
    ctx.lineCap = "round";
    ctx.stroke();

    // 光沢の白い円弧（内側寄り）
    ctx.beginPath();
    ctx.arc(0, 0, radius - wallThick * 0.15, startAngle + 0.3, startAngle + (endAngle - startAngle) * 0.35);
    ctx.lineWidth = wallThick * 0.2;
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.restore();
  }

  drawBelt(x: number, y: number, w: number, h: number, angle: number, direction: number, elapsed: number, hitAge = -1): void {
    const ctx = this.ctx;
    const HIT_DURATION = 0.3;
    const isHit = hitAge >= 0 && hitAge < HIT_DURATION;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Shadow
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 2, -h / 2 + 2, w, h, 4);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fill();

    // Belt body
    const topColor = isHit ? COLORS.goldLight : "#5D7B3A";
    const bottomColor = isHit ? COLORS.gold : "#3E5426";
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#2E3D1A";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Animated stripes (conveyor movement)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    ctx.clip();

    const stripeW = 8;
    const stripeGap = 12;
    const totalStep = stripeW + stripeGap;
    const offset = ((elapsed * 60 * direction) % totalStep + totalStep) % totalStep;
    ctx.fillStyle = isHit ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)";
    for (let sx = -w / 2 - totalStep + offset; sx < w / 2 + totalStep; sx += totalStep) {
      ctx.fillRect(sx, -h / 2, stripeW, h);
    }
    ctx.restore();

    // Direction arrow
    const arrowY = 0;
    const arrowSize = Math.min(h * 0.4, 6);
    ctx.fillStyle = isHit ? COLORS.white : "rgba(255,255,255,0.5)";
    ctx.beginPath();
    if (direction > 0) {
      ctx.moveTo(w / 2 - arrowSize * 3, arrowY - arrowSize);
      ctx.lineTo(w / 2 - arrowSize, arrowY);
      ctx.lineTo(w / 2 - arrowSize * 3, arrowY + arrowSize);
    } else {
      ctx.moveTo(-w / 2 + arrowSize * 3, arrowY - arrowSize);
      ctx.lineTo(-w / 2 + arrowSize, arrowY);
      ctx.lineTo(-w / 2 + arrowSize * 3, arrowY + arrowSize);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Rollers at each end (drawn in world space)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const rollerR = Math.max(4, h * 0.6);
    for (const side of [-1, 1]) {
      const rx = (side * w) / 2;
      ctx.beginPath();
      ctx.arc(rx, 0, rollerR, 0, Math.PI * 2);
      ctx.fillStyle = isHit ? COLORS.gold : "#4A6B2A";
      ctx.fill();
      ctx.strokeStyle = "#2E3D1A";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  drawTrampoline(x: number, y: number): void {
    const ctx = this.ctx;

    // Legs
    ctx.fillStyle = COLORS.dark;
    ctx.fillRect(x - 26, y, 5, 18);
    ctx.fillRect(x + 21, y, 5, 18);

    // Spring lines
    ctx.strokeStyle = COLORS.dark;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 6);
    for (let i = 0; i < 8; i++) {
      ctx.lineTo(x - 20 + i * 5 + 2.5, y + (i % 2 === 0 ? 2 : 10));
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Surface
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 32, 8, 0, Math.PI, 0);
    const grad = ctx.createLinearGradient(0, y - 6, 0, y + 10);
    grad.addColorStop(0, COLORS.red);
    grad.addColorStop(1, COLORS.redDark);
    ctx.fillStyle = grad;
    ctx.fill();

    // Bounce arrows
    const bounce = 0; // アニメーション無効化: Math.sin(this.t * 4) * 2
    ctx.fillStyle = COLORS.goldLight;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 8 - bounce);
    ctx.lineTo(x + 5, y - 8 - bounce);
    ctx.lineTo(x, y - 16 - bounce);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  drawShelf(shelf: Shelf, deleteProgress = 0): void {
    const ctx = this.ctx;
    const pts = shelf.curvePoints;
    if (pts.length < 2) return;

    // 長押し削除中は棚全体を赤く変化させます
    const isDeleting = deleteProgress > 0;
    const shake = isDeleting ? Math.sin(deleteProgress * 20) * deleteProgress * 3 : 0;

    ctx.save();
    if (shake !== 0) {
      ctx.translate(shake, 0);
    }

    // スプラインのパスを描画します
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i]!.x, pts[i]!.y);
    }

    // 削除中は赤系の色に変化します
    const glowColor = isDeleting
      ? `rgba(231,76,60,${0.15 + deleteProgress * 0.2})`
      : "rgba(243,156,18,0.15)";
    const mainColor = isDeleting
      ? `rgba(231,76,60,${0.5 + deleteProgress * 0.3})`
      : "rgba(243,156,18,0.5)";
    const innerColor = isDeleting
      ? `rgba(255,100,80,${0.3 + deleteProgress * 0.2})`
      : "rgba(255,217,61,0.3)";

    // Outer glow
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Main line
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 8;
    ctx.stroke();

    // Inner highlight
    ctx.strokeStyle = innerColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.lineCap = "butt";

    // 端点と中央のハンドルを描画します
    const midIndex = Math.floor(shelf.anchors.length / 2);
    const endpoints = [0, midIndex, shelf.anchors.length - 1];
    for (const j of endpoints) {
      const a = shelf.anchors[j]!;
      const handleColor = isDeleting ? COLORS.red : COLORS.gold;

      // 長押し中はプログレスリングを表示します
      if (isDeleting) {
        ctx.beginPath();
        ctx.arc(a.x, a.y, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * deleteProgress);
        ctx.strokeStyle = COLORS.red;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(a.x, a.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = isDeleting ? "rgba(255,200,200,0.9)" : "rgba(255,255,255,0.85)";
      ctx.fill();
      ctx.strokeStyle = handleColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(a.x, a.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = handleColor;
      ctx.fill();
    }

    ctx.restore();
  }

  drawCurrentPath(points: { x: number; y: number }[]): void {
    if (points.length < 2) return;
    const ctx = this.ctx;

    ctx.beginPath();
    const first = points[0]!;
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < points.length; i++) {
      const p = points[i]!;
      ctx.lineTo(p.x, p.y);
    }

    ctx.strokeStyle = "rgba(243,156,18,0.25)";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    // Dashed preview
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = "rgba(243,156,18,0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineCap = "butt";
  }

  drawLevelBackground(level: number, w: number, h: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(74,32,32,0.04)";
    ctx.font = "bold 160px 'Hachi Maru Pop', cursive";
    ctx.fillText(`${level}`, w / 2, h / 2);
    ctx.fillStyle = "rgba(74,32,32,0.025)";
    ctx.font = "bold 40px 'Hachi Maru Pop', cursive";
    ctx.fillText(`Lv.${level}`, w / 2, h / 2 + 90);
    ctx.restore();
  }

  drawHUD(
    _level: number,
    w: number,
    timeRemaining: number,
    timerStarted: boolean,
    timeLimit = 30,
  ): void {
    const ctx = this.ctx;

    // Timer - circular progress
    const timerX = w / 2;
    const timerY = 27;
    const timerR = 20;
    const seconds = Math.ceil(timeRemaining);
    const isUrgent = timerStarted && timeRemaining <= 10;
    const progress = timerStarted ? timeRemaining / timeLimit : 1;

    // Background circle
    ctx.beginPath();
    ctx.arc(timerX, timerY, timerR, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.white;
    ctx.fill();

    // Progress arc
    ctx.beginPath();
    ctx.moveTo(timerX, timerY);
    ctx.arc(
      timerX,
      timerY,
      timerR,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * progress,
    );
    ctx.closePath();
    ctx.fillStyle = isUrgent
      ? `rgba(231,76,60,${0.2 + Math.sin(this.t * 6) * 0.1})`
      : "rgba(46,204,113,0.2)";
    ctx.fill();

    // Border
    ctx.beginPath();
    ctx.arc(timerX, timerY, timerR, 0, Math.PI * 2);
    ctx.strokeStyle = isUrgent ? COLORS.red : "rgba(74,32,32,0.15)";
    ctx.lineWidth = isUrgent ? 2.5 : 1.5;
    ctx.stroke();

    // Time text
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isUrgent ? COLORS.red : COLORS.dark;
    ctx.font = `${isUrgent ? "15" : "13"}px 'Hachi Maru Pop', cursive`;

    if (timerStarted) {
      ctx.fillText(`${seconds}`, timerX, timerY);
    } else {
      ctx.globalAlpha = 0.4;
      ctx.fillText(`${timeLimit}`, timerX, timerY);
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = "left";
  }

  drawMarbleInfo(marbleCount: number, w: number): void {
    const ctx = this.ctx;

    // Small marble icon + count
    const infoY = 54;

    if (marbleCount > 0) {
      this.drawMarble(w - 50, infoY, 6);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = COLORS.dark;
      ctx.globalAlpha = 0.5;
      ctx.font = "10px 'Hachi Maru Pop', cursive";
      ctx.fillText(`x${marbleCount}`, w - 42, infoY);
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = "left";
  }

  drawGoalEffect(effect: GoalEffect): void {
    const ctx = this.ctx;
    const alpha = Math.max(0, 1 - effect.age);

    // Particles
    for (const p of effect.particles) {
      ctx.globalAlpha = alpha * 0.8;
      const size = (4 * alpha + 1) * (1 + Math.sin(effect.age * 10) * 0.2);
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    // Score popup floating upward with scale
    const offsetY = effect.age * -70;
    const popScale = Math.min(1, effect.age * 5) * (1 + (1 - effect.age) * 0.2);

    ctx.save();
    ctx.translate(effect.x, effect.y + offsetY - 20);
    ctx.scale(popScale, popScale);
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.gold;
    ctx.font = "30px 'Hachi Maru Pop', cursive";
    ctx.fillText(`${effect.score}`, 0, 0);
    ctx.fillStyle = COLORS.dark;
    ctx.globalAlpha = alpha * 0.6;
    ctx.font = "11px 'Hachi Maru Pop', cursive";
    ctx.fillText("ゴール！", 0, 20);
    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  drawBreakEffect(effect: BreakEffect): void {
    const ctx = this.ctx;
    const alpha = Math.max(0, 1 - effect.age / 0.6);

    for (const p of effect.particles) {
      ctx.globalAlpha = alpha * 0.9;
      const size = p.size * alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  drawResetButton(h: number): void {
    this.drawButton(28, h - 28, 40, 40, "", COLORS.white, COLORS.dark, "reset");
  }

  drawBackButton(h: number): void {
    this.drawButton(76, h - 28, 40, 40, "", COLORS.white, COLORS.dark, "back");
  }


  private isPressed(x: number, y: number, w: number, h: number): boolean {
    if (!this.pressedPoint) return false;
    const px = this.pressedPoint.x;
    const py = this.pressedPoint.y;
    return (
      px >= x - w / 2 - 6 &&
      px <= x + w / 2 + 6 &&
      py >= y - h / 2 - 6 &&
      py <= y + h / 2 + 6
    );
  }

  private drawButton(
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    bg: string,
    fg: string,
    icon?: string,
  ): void {
    const ctx = this.ctx;
    const pressed = this.isPressed(x, y, w, h);
    const shadowH = pressed ? 1 : 4;
    const offsetY = pressed ? 3 : 0;

    const bx = x - w / 2;
    const by = y - h / 2 + offsetY;
    const r = Math.min(h / 2, 16);

    // Shadow
    ctx.beginPath();
    ctx.roundRect(bx, by + shadowH, w, h, r);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, r);
    ctx.fillStyle = bg;
    ctx.fill();

    // Border
    const isLight = bg === COLORS.white || bg === "#E0FFE8" || bg === "#FFE0E0";
    if (isLight) {
      ctx.strokeStyle = bg === "#FFE0E0"
        ? "rgba(231,76,60,0.3)"
        : bg === "#E0FFE8"
          ? "rgba(39,174,96,0.3)"
          : "rgba(74,32,32,0.12)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Top highlight
    if (!pressed) {
      ctx.beginPath();
      ctx.roundRect(bx + 2, by + 1, w - 4, h * 0.35, [r, r, 0, 0]);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fill();
    }

    // Draw icon if specified
    if (icon) {
      this.drawIcon(x, y + offsetY, icon, fg, Math.min(w, h) * 0.45);
    }

    // Text
    if (text) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = fg;
      const fontSize = Math.min(h * 0.4, 16);
      ctx.font = `${fontSize}px 'Hachi Maru Pop', cursive`;
      const textY = icon ? y + offsetY + 2 : y + offsetY;
      ctx.fillText(text, x, textY);
    }
  }

  private drawIcon(x: number, y: number, icon: string, color: string, size: number): void {
    const ctx = this.ctx;
    const s = size;

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (icon) {
      case "pencil": {
        // Simple pencil shape
        const px = x - s * 0.3;
        const py = y + s * 0.3;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + s * 0.5, py - s * 0.5);
        ctx.lineTo(px + s * 0.65, py - s * 0.35);
        ctx.lineTo(px + s * 0.15, py + s * 0.15);
        ctx.closePath();
        ctx.fill();
        // Tip
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - s * 0.1, py + s * 0.1);
        ctx.lineTo(px + s * 0.15, py + s * 0.15);
        ctx.closePath();
        ctx.fillStyle = COLORS.gold;
        ctx.fill();
        break;
      }
      case "eraser": {
        // Eraser rectangle
        ctx.beginPath();
        ctx.roundRect(x - s * 0.35, y - s * 0.2, s * 0.7, s * 0.4, 3);
        ctx.fillStyle = COLORS.red;
        ctx.fill();
        // Bottom part
        ctx.beginPath();
        ctx.roundRect(x - s * 0.35, y, s * 0.7, s * 0.15, [0, 0, 3, 3]);
        ctx.fillStyle = "#FFB0B0";
        ctx.fill();
        break;
      }
      case "reset": {
        // Circular arrow
        ctx.beginPath();
        ctx.arc(x, y, s * 0.35, -Math.PI * 0.3, Math.PI * 1.3);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        // Arrow head
        const ax = x + Math.cos(-Math.PI * 0.3) * s * 0.35;
        const ay = y + Math.sin(-Math.PI * 0.3) * s * 0.35;
        ctx.beginPath();
        ctx.moveTo(ax - 4, ay - 2);
        ctx.lineTo(ax + 1, ay - 5);
        ctx.lineTo(ax + 1, ay + 3);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        break;
      }
      case "back": {
        // Left arrow
        ctx.beginPath();
        ctx.moveTo(x + s * 0.25, y - s * 0.3);
        ctx.lineTo(x - s * 0.2, y);
        ctx.lineTo(x + s * 0.25, y + s * 0.3);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        break;
      }
      case "roll": {
        // Small marble icon before text
        const mx = x - 42;
        this.drawMarble(mx, y, 8);
        break;
      }
      case "stop": {
        // Square stop icon
        ctx.fillStyle = COLORS.white;
        ctx.fillRect(x - 30, y - s * 0.2, s * 0.4, s * 0.4);
        break;
      }
      case "slower": {
        // Turtle-like: small circle with lines
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.font = "14px 'Hachi Maru Pop', cursive";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("-", x, y);
        ctx.globalAlpha = 1;
        break;
      }
      case "faster": {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.font = "14px 'Hachi Maru Pop', cursive";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("+", x, y);
        ctx.globalAlpha = 1;
        break;
      }
      case "bounce_less": {
        // Down arrow (less bounce)
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(x, y + 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y + 6);
        ctx.lineTo(x, y + 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case "bounce_more": {
        // Up arrow (more bounce)
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(x, y + 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y - 2);
        ctx.lineTo(x, y - 7);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Up arrow head
        ctx.beginPath();
        ctx.moveTo(x - 3, y - 5);
        ctx.lineTo(x, y - 9);
        ctx.lineTo(x + 3, y - 5);
        ctx.stroke();
        ctx.globalAlpha = 1;
        break;
      }
      case "play": {
        // Play triangle before text
        const tx = x - 58;
        ctx.beginPath();
        ctx.moveTo(tx, y - 8);
        ctx.lineTo(tx, y + 8);
        ctx.lineTo(tx + 12, y);
        ctx.closePath();
        ctx.fillStyle = COLORS.white;
        ctx.fill();
        break;
      }
      case "next": {
        // Right arrow after text
        const nx = x + 42;
        ctx.beginPath();
        ctx.moveTo(nx, y - 6);
        ctx.lineTo(nx, y + 6);
        ctx.lineTo(nx + 8, y);
        ctx.closePath();
        ctx.fillStyle = COLORS.white;
        ctx.fill();
        break;
      }
      case "retry": {
        // Circular arrow (same as reset but smaller)
        const rx = x - 50;
        ctx.beginPath();
        ctx.arc(rx, y, 7, -Math.PI * 0.3, Math.PI * 1.3);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      }
      case "gear": {
        // Gear icon
        const gr = s * 0.35;
        const teeth = 6;
        ctx.beginPath();
        for (let i = 0; i < teeth * 2; i++) {
          const angle = (i * Math.PI) / teeth;
          const r2 = i % 2 === 0 ? gr : gr * 0.7;
          const gx = x + Math.cos(angle) * r2;
          const gy = y + Math.sin(angle) * r2;
          if (i === 0) ctx.moveTo(gx, gy);
          else ctx.lineTo(gx, gy);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.fill();
        // Center hole
        ctx.beginPath();
        ctx.arc(x, y, gr * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.white;
        ctx.globalAlpha = 1;
        ctx.fill();
        break;
      }
      default:
        break;
    }

    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
  }

  private drawObstacleCard(
    x: number, y: number, w: number, h: number,
    type: string, label: string, isSelected: boolean,
  ): void {
    const ctx = this.ctx;
    const r = 16;
    const scale = 1; // アニメーション無効化: isSelected ? 1 + Math.sin(this.t * 3) * 0.03 : 1

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);

    const bx = x - w / 2;
    const by = y - h / 2;

    // Card shadow
    ctx.beginPath();
    ctx.roundRect(bx + 2, by + 4, w, h, r);
    ctx.fillStyle = isSelected ? "rgba(243,156,18,0.2)" : "rgba(0,0,0,0.08)";
    ctx.fill();

    // Card body
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, r);
    ctx.fillStyle = isSelected ? "#FFF3D6" : COLORS.white;
    ctx.fill();
    ctx.strokeStyle = isSelected ? COLORS.gold : "rgba(74,32,32,0.1)";
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.stroke();

    // Check mark when selected
    if (isSelected) {
      const checkX = x + w / 2 - 16;
      const checkY = y - h / 2 + 16;
      ctx.beginPath();
      ctx.arc(checkX, checkY, 12, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.gold;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(checkX - 5, checkY);
      ctx.lineTo(checkX - 1, checkY + 4);
      ctx.lineTo(checkX + 6, checkY - 4);
      ctx.strokeStyle = COLORS.white;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.lineJoin = "miter";
    }

    // Preview shape
    const previewY = y - 10;
    if (type === "rect") {
      const rw = 48, rh = 18;
      const swayAngle = 0; // アニメーション無効化: Math.sin(this.t * 0.8) * (15 * Math.PI / 180)
      ctx.save();
      ctx.translate(x, previewY);
      ctx.rotate(swayAngle);
      ctx.beginPath();
      ctx.roundRect(-rw / 2, -rh / 2, rw, rh, 6);
      const grad = ctx.createLinearGradient(0, -rh / 2, 0, rh / 2);
      grad.addColorStop(0, COLORS.red);
      grad.addColorStop(1, COLORS.redDark);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-rw / 2, -rh / 2, rw, 4, [4, 4, 0, 0]);
      ctx.fillStyle = COLORS.gold;
      ctx.fill();
      ctx.restore();
    } else if (type === "circle") {
      const baseR = 22;
      const pulseScale = 1; // アニメーション無効化: 1 + Math.sin(this.t * 1.2) * 0.2
      const cr = baseR * pulseScale;
      const grad = ctx.createRadialGradient(x - cr * 0.2, previewY - cr * 0.2, 0, x, previewY, cr);
      grad.addColorStop(0, "#90CAF9");
      grad.addColorStop(0.5, COLORS.blue);
      grad.addColorStop(1, COLORS.blueDark);
      ctx.beginPath();
      ctx.arc(x, previewY, cr, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = COLORS.blueDark;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x - cr * 0.2, previewY - cr * 0.25, cr * 0.35, cr * 0.2, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fill();
    } else if (type === "triangle") {
      const s = 22;
      const bobY = previewY;
      const hw = s * Math.sqrt(3) / 2;
      const grad = ctx.createLinearGradient(x, bobY - s, x, bobY + s * 0.5);
      grad.addColorStop(0, COLORS.green);
      grad.addColorStop(1, "#1B8C4F");
      ctx.beginPath();
      ctx.moveTo(x, bobY - s);
      ctx.lineTo(x + hw, bobY + s * 0.5);
      ctx.lineTo(x - hw, bobY + s * 0.5);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "#1B8C4F";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, bobY - s * 0.6);
      ctx.lineTo(x + hw * 0.4, bobY + s * 0.15);
      ctx.lineTo(x - hw * 0.1, bobY + s * 0.15);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fill();
    } else if (type === "cross") {
      const armLen = 22;
      const armW = 8;
      const angle = this.t * 1.5;

      ctx.save();
      ctx.translate(x, previewY);
      ctx.rotate(angle);

      const grad = ctx.createLinearGradient(-armLen, 0, armLen, 0);
      grad.addColorStop(0, "#E67E22");
      grad.addColorStop(0.5, "#F39C12");
      grad.addColorStop(1, "#E67E22");

      // Horizontal arm
      ctx.beginPath();
      ctx.roundRect(-armLen, -armW / 2, armLen * 2, armW, 3);
      ctx.fillStyle = grad;
      ctx.fill();

      // Vertical arm
      ctx.beginPath();
      ctx.roundRect(-armW / 2, -armLen, armW, armLen * 2, 3);
      ctx.fillStyle = grad;
      ctx.fill();

      // Center circle
      ctx.beginPath();
      ctx.arc(0, 0, armW * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = "#D4740E";
      ctx.fill();

      ctx.restore();
    } else if (type === "seesaw") {
      const boardW = 50;
      const boardH = 8;
      const seesawAngle = Math.sin(this.t * 1.2) * 0.3;

      ctx.save();
      ctx.translate(x, previewY);
      ctx.rotate(seesawAngle);

      // Board
      const grad = ctx.createLinearGradient(-boardW / 2, 0, boardW / 2, 0);
      grad.addColorStop(0, "#5B3A8C");
      grad.addColorStop(0.5, "#8E6BBE");
      grad.addColorStop(1, "#5B3A8C");
      ctx.beginPath();
      ctx.roundRect(-boardW / 2, -boardH / 2, boardW, boardH, 3);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "#4A2870";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();

      // Pivot triangle
      const pivotSize = 8;
      ctx.beginPath();
      ctx.moveTo(x - pivotSize * 0.6, previewY + pivotSize);
      ctx.lineTo(x + pivotSize * 0.6, previewY + pivotSize);
      ctx.lineTo(x, previewY);
      ctx.closePath();
      ctx.fillStyle = "#4A2870";
      ctx.fill();
    } else if (type === "ushape") {
      const r = 16;
      const thick = r * 0.25;
      const gap = Math.PI * 0.25;
      const sa = -Math.PI / 2 + gap;
      const ea = -Math.PI / 2 + Math.PI * 2 - gap;
      const rotAngle = this.t * 0.8;

      ctx.save();
      ctx.translate(x, previewY);
      ctx.rotate(rotAngle);

      ctx.beginPath();
      ctx.arc(0, 0, r, sa, ea);
      ctx.lineWidth = thick;
      ctx.strokeStyle = "#7B1FA2";
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, r, sa, ea);
      ctx.lineWidth = thick * 0.6;
      ctx.strokeStyle = "#9C27B0";
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.restore();
    } else if (type === "belt") {
      const bw = 50;
      const bh = 10;

      ctx.save();
      ctx.translate(x, previewY);

      // Belt body
      const grad = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2);
      grad.addColorStop(0, "#5D7B3A");
      grad.addColorStop(1, "#3E5426");
      ctx.beginPath();
      ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 3);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "#2E3D1A";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Animated stripes
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 3);
      ctx.clip();
      const stripeW = 5;
      const stripeGap = 7;
      const totalStep = stripeW + stripeGap;
      const offset = ((this.t * 60) % totalStep + totalStep) % totalStep;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      for (let sx = -bw / 2 - totalStep + offset; sx < bw / 2 + totalStep; sx += totalStep) {
        ctx.fillRect(sx, -bh / 2, stripeW, bh);
      }
      ctx.restore();

      // Direction arrow
      const arrowSize = 4;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.moveTo(bw / 2 - arrowSize * 3, -arrowSize);
      ctx.lineTo(bw / 2 - arrowSize, 0);
      ctx.lineTo(bw / 2 - arrowSize * 3, arrowSize);
      ctx.closePath();
      ctx.fill();

      // Rollers
      const rollerR = 5;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc((side * bw) / 2, 0, rollerR, 0, Math.PI * 2);
        ctx.fillStyle = "#4A6B2A";
        ctx.fill();
        ctx.strokeStyle = "#2E3D1A";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    }

    // Label
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.dark;
    ctx.font = "13px 'Hachi Maru Pop', cursive";
    ctx.fillText(label, x, y + h / 2 - 22);

    ctx.restore();
  }

  private drawStar(x: number, y: number, r: number, filled: boolean): void {
    const ctx = this.ctx;
    const spikes = 5;
    const outerRadius = r;
    const innerRadius = r * 0.4;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    if (filled) {
      const starGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
      starGrad.addColorStop(0, COLORS.goldLight);
      starGrad.addColorStop(1, COLORS.gold);
      ctx.fillStyle = starGrad;
    } else {
      ctx.fillStyle = "rgba(243,156,18,0.12)";
    }
    ctx.fill();

    if (filled) {
      ctx.strokeStyle = "#D4740E";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  /** 離散的なステップ選択UIを描画します (step は 0,1,2 の整数値) */
  drawStepSelector(
    cx: number,
    y: number,
    label: string,
    step: number,
    stepLabels: string[],
  ): void {
    const ctx = this.ctx;
    const count = stepLabels.length;
    const btnW = 58;
    const btnGap = 6;
    const btnAreaW = btnW * count + btnGap * (count - 1);
    const btnStartX = cx - btnAreaW / 2;

    // Label (ボタン群の上にセンタリング)
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.dark;
    ctx.globalAlpha = 0.5;
    ctx.font = "11px 'Hachi Maru Pop', cursive";
    ctx.fillText(label, cx, y - 26);
    ctx.globalAlpha = 1;

    // Step buttons
    for (let i = 0; i < count; i++) {
      const bx = btnStartX + i * (btnW + btnGap);
      const isSelected = i === step;

      ctx.beginPath();
      ctx.roundRect(bx, y - 14, btnW, 28, 8);
      if (isSelected) {
        ctx.fillStyle = COLORS.red;
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(74,32,32,0.08)";
        ctx.fill();
        ctx.strokeStyle = "rgba(74,32,32,0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "12px 'Hachi Maru Pop', cursive";
      ctx.fillStyle = isSelected ? COLORS.white : COLORS.dark;
      ctx.fillText(stepLabels[i]!, bx + btnW / 2, y);
    }

    ctx.textAlign = "center";
  }

  /** トグルスイッチを描画します */
  drawToggle(cx: number, y: number, label: string, isOn: boolean): void {
    const ctx = this.ctx;
    const trackW = 44;
    const trackH = 24;
    const knobR = 10;

    // ラベル
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.dark;
    ctx.globalAlpha = 0.6;
    ctx.font = "13px 'Hachi Maru Pop', cursive";
    ctx.fillText(label, cx - 6, y);
    ctx.globalAlpha = 1;

    // トラック
    const trackX = cx + 4;
    ctx.beginPath();
    ctx.roundRect(trackX, y - trackH / 2, trackW, trackH, trackH / 2);
    ctx.fillStyle = isOn ? COLORS.blue : "#CCCCCC";
    ctx.fill();

    // ノブ
    const knobX = isOn ? trackX + trackW - knobR - 2 : trackX + knobR + 2;
    ctx.beginPath();
    ctx.arc(knobX, y, knobR, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.white;
    ctx.fill();
    ctx.strokeStyle = isOn ? COLORS.blueDark : "#AAAAAA";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = "left";
  }

  // ========================================
  // 積み木モード用描画メソッド
  // ========================================

  /** 積み木モードの棚パーツを描画します */
  drawTsumikiShelf(x: number, y: number, length: number, angle: number, isSelected: boolean): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 棚の本体
    const h = 10;
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, "#8B6914");
    grad.addColorStop(0.3, "#C4952A");
    grad.addColorStop(0.7, "#A07820");
    grad.addColorStop(1, "#6B5010");

    ctx.beginPath();
    ctx.roundRect(-length / 2, -h / 2, length, h, 3);
    ctx.fillStyle = grad;
    ctx.fill();

    // 木目模様
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 0.5;
    for (let i = -length / 2 + 10; i < length / 2; i += 15) {
      ctx.beginPath();
      ctx.moveTo(i, -h / 2 + 2);
      ctx.lineTo(i + 5, h / 2 - 2);
      ctx.stroke();
    }

    // 選択時のハイライト
    if (isSelected) {
      ctx.strokeStyle = COLORS.blue;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-length / 2 - 3, -h / 2 - 3, length + 6, h + 6, 5);
      ctx.stroke();
    }

    ctx.restore();
  }

  /** 選択中のパーツの回転ハンドルを描画します */
  drawRotationHandle(x: number, y: number, angle: number): void {
    const ctx = this.ctx;
    const handleDist = 50;
    const handleX = x + Math.cos(angle) * handleDist;
    const handleY = y + Math.sin(angle) * handleDist;

    // 接続線
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(x, y);
    ctx.lineTo(handleX, handleY);
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // ハンドル（丸いつまみ）
    ctx.beginPath();
    ctx.arc(handleX, handleY, 12, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.white;
    ctx.fill();
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 回転アイコン
    ctx.beginPath();
    ctx.arc(handleX, handleY, 6, -Math.PI * 0.3, Math.PI * 1.3);
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 矢印
    const arrowAngle = Math.PI * 1.3;
    const ax = handleX + Math.cos(arrowAngle) * 6;
    const ay = handleY + Math.sin(arrowAngle) * 6;
    ctx.beginPath();
    ctx.moveTo(ax + 3, ay - 2);
    ctx.lineTo(ax, ay);
    ctx.lineTo(ax + 3, ay + 3);
    ctx.stroke();
  }

  /** 選択状態のハイライトを描画します（回転対応） */
  drawTsumikiSelection(x: number, y: number, w: number, h: number, angle = 0): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.roundRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 6);
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** フェーズ切り替え時のフィードバックアニメーションを描画します */
  drawPhaseTransition(w: number, h: number, age: number): void {
    const ctx = this.ctx;
    const alpha = Math.max(0, 1 - age);

    // 画面全体にフラッシュ
    ctx.fillStyle = `rgba(41, 128, 185, ${alpha * 0.15})`;
    ctx.fillRect(0, 0, w, h);

    // 「スタート！」テキスト
    if (age < 0.8) {
      const scale = 1 + age * 0.3;
      const textAlpha = age < 0.2 ? age / 0.2 : Math.max(0, 1 - (age - 0.2) / 0.6);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.globalAlpha = textAlpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = COLORS.blue;
      ctx.font = "36px 'Hachi Maru Pop', cursive";
      ctx.fillText("スタート！", 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  /** 積み木モード用のクリア画面を描画します */
  drawTsumikiClearScreen(w: number, h: number, goalsScored: number, totalScore: number, unusedBonus: number, timeBonus: number, hasNextLevel: boolean): void {
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h / 2;

    // Confetti background
    for (let i = 0; i < 20; i++) {
      const confX = (Math.sin(i * 7.3 + this.t * 0.8) * 0.5 + 0.5) * w;
      const confY = ((i * 41 + this.t * 30) % (h + 40)) - 20;
      const confSize = 4 + (i % 3) * 2;
      const confColors = [COLORS.red, COLORS.gold, COLORS.blue, COLORS.green];
      ctx.fillStyle = confColors[i % confColors.length]!;
      ctx.globalAlpha = 0.4;
      ctx.save();
      ctx.translate(confX, confY);
      ctx.rotate(this.t * 2 + i);
      ctx.fillRect(-confSize / 2, -confSize / 2, confSize, confSize * 0.4);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // "Clear" with scale pulse
    const scale = 1 + Math.sin(this.t * 3) * 0.03;
    ctx.save();
    ctx.translate(cx, cy - 120);
    ctx.scale(scale, scale);
    ctx.fillStyle = COLORS.blue;
    ctx.font = "42px 'Hachi Maru Pop', cursive";
    ctx.fillText("クリア！", 0, 0);
    ctx.restore();

    // Total score
    ctx.fillStyle = COLORS.gold;
    ctx.font = "48px 'Hachi Maru Pop', cursive";
    ctx.fillText(`${totalScore}`, cx, cy - 50);

    ctx.fillStyle = COLORS.dark;
    ctx.globalAlpha = 0.6;
    ctx.font = "13px 'Hachi Maru Pop', cursive";
    ctx.fillText("てん", cx, cy - 20);
    ctx.globalAlpha = 1;

    // スコア内訳
    const detailY = cy + 10;
    ctx.font = "12px 'Hachi Maru Pop', cursive";
    ctx.fillStyle = COLORS.dark;
    ctx.globalAlpha = 0.7;
    ctx.fillText(`ゴール: ${goalsScored}`, cx, detailY);
    ctx.fillText(`のこりパーツ: +${unusedBonus}`, cx, detailY + 20);
    ctx.fillText(`じかん: +${timeBonus}`, cx, detailY + 40);
    ctx.globalAlpha = 1;

    // Stars
    const starY = detailY + 70;
    const star1 = totalScore >= 2;
    const star2 = totalScore >= 5;
    const star3 = totalScore >= 8;
    this.drawStar(cx - 50, starY, 26, star1);
    this.drawStar(cx, starY - 10, 30, star2);
    this.drawStar(cx + 50, starY, 26, star3);

    const btnBaseY = starY + 50;
    if (hasNextLevel) {
      this.drawButton(cx, btnBaseY, 200, 54, "つぎへ", COLORS.blue, COLORS.white, "next");
      this.drawButton(cx, btnBaseY + 65, 200, 48, "もういちど", COLORS.red, COLORS.white, "retry");
      this.drawButton(cx, btnBaseY + 125, 200, 48, "タイトルへ", COLORS.white, COLORS.dark);
    } else {
      this.drawButton(cx, btnBaseY, 200, 54, "もういちど", COLORS.red, COLORS.white, "retry");
      this.drawButton(cx, btnBaseY + 65, 200, 48, "タイトルへ", COLORS.white, COLORS.dark);
    }
  }
}

