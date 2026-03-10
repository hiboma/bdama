import type { Shelf } from "../entities/Shelf";
import type { GoalEffect, BreakEffect, ObstacleType } from "./Game";

const COLORS = {
  red: "#E74C3C",
  redDark: "#C0392B",
  gold: "#F39C12",
  goldLight: "#FFD93D",
  blue: "#2980B9",
  blueDark: "#1F6DA0",
  green: "#27AE60",
  cream: "#FFF8E1",
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

  drawBackground(w: number, h: number): void {
    this.frame++;
    const ctx = this.ctx;
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

  drawTitleScreen(w: number, h: number, selectedObstacles: Set<ObstacleType>, speed?: number, densityScale?: number): void {
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h / 2;

    // Floating marble
    const bounce = Math.sin(this.t * 2) * 8;
    this.drawMarble(cx, cy - 160 + bounce, 45);

    // Title
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(74,32,32,0.1)";
    ctx.font = "30px 'Hachi Maru Pop', cursive";
    ctx.fillText("ビー玉", cx + 2, cy - 100);
    ctx.fillText("ころころ", cx + 2, cy - 66);
    ctx.fillStyle = COLORS.red;
    ctx.font = "30px 'Hachi Maru Pop', cursive";
    ctx.fillText("ビー玉", cx, cy - 102);
    ctx.fillText("ころころ", cx, cy - 68);

    // Subtitle
    ctx.fillStyle = COLORS.dark;
    ctx.globalAlpha = 0.5;
    ctx.font = "12px 'Hachi Maru Pop', cursive";
    ctx.fillText("じゃまものを えらんでね", cx, cy - 36);
    ctx.globalAlpha = 1;

    // Obstacle cards
    const cardW = 80;
    const cardH = 110;
    const gap = 8;
    const cardCount = 4;
    const totalW = cardW * cardCount + gap * (cardCount - 1);
    const startX = cx - totalW / 2 + cardW / 2;
    const cardY = cy + 30;
    const types: ObstacleType[] = ["rect", "circle", "triangle", "cross"];
    const labels = ["しかく", "まる", "さんかく", "くるくる"];

    for (let i = 0; i < cardCount; i++) {
      const cardX = startX + i * (cardW + gap);
      const isSelected = selectedObstacles.has(types[i]!);
      this.drawObstacleCard(cardX, cardY, cardW, cardH, types[i]!, labels[i]!, isSelected);
    }

    // Feedback message
    const msgY = cardY + cardH / 2 + 22;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 13px 'Hachi Maru Pop', cursive";
    if (selectedObstacles.size === 0) {
      ctx.fillStyle = "#3a2020";
      ctx.fillText("いくつでも えらべるよ！", cx, msgY);
    } else {
      ctx.fillStyle = "#c07000";
      ctx.fillText(`${selectedObstacles.size}こ えらんだ！`, cx, msgY);
    }

    // Play button
    const btnY = cardY + cardH / 2 + 60;
    if (selectedObstacles.size > 0) {
      this.drawButton(cx, btnY, 200, 54, "あそぶ", COLORS.red, COLORS.white, "play");
    } else {
      this.drawButton(cx, btnY, 200, 54, "あそぶ", "#E0E0E0", "#AAAAAA");
    }

    // Settings sliders
    if (speed !== undefined && densityScale !== undefined) {
      const sliderW = 200;
      const speedY = btnY + 60;
      const densityY = speedY + 56;
      this.drawSlider(cx, speedY, sliderW, "はやさ", speed, 0.2, 1.0);
      this.drawSlider(cx, densityY, sliderW, "おもさ", densityScale, 0.2, 3.0);
    }

    ctx.textAlign = "left";
  }

  drawClearScreen(w: number, h: number, goalsScored: number): void {
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

    this.drawButton(cx, cy + 125, 200, 54, "もういちど", COLORS.red, COLORS.white, "retry");
    this.drawButton(cx, cy + 190, 200, 48, "タイトルへ", COLORS.white, COLORS.dark);
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

    // Shadow
    ctx.beginPath();
    ctx.moveTo(x + 2, y - s * 0.7 + 2);
    ctx.lineTo(x + s + 2, y + s * 0.5 + 2);
    ctx.lineTo(x - s + 2, y + s * 0.5 + 2);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fill();

    // Body
    const baseColor = isHit ? COLORS.goldLight : COLORS.green;
    const darkColor = isHit ? COLORS.gold : "#1B8C4F";
    const grad = ctx.createLinearGradient(x, y - s, x, y + s * 0.6);
    grad.addColorStop(0, baseColor);
    grad.addColorStop(1, darkColor);

    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.7);
    ctx.lineTo(x + s, y + s * 0.5);
    ctx.lineTo(x - s, y + s * 0.5);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Border
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Highlight
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.5);
    ctx.lineTo(x + s * 0.4, y + s * 0.1);
    ctx.lineTo(x - s * 0.1, y + s * 0.1);
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
  ): void {
    const ctx = this.ctx;

    // Timer - circular progress
    const timerX = w / 2;
    const timerY = 27;
    const timerR = 20;
    const seconds = Math.ceil(timeRemaining);
    const isUrgent = timerStarted && timeRemaining <= 10;
    const progress = timerStarted ? timeRemaining / 30 : 1;

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
      ctx.fillText("30", timerX, timerY);
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
      const s = 28;
      const bobY = previewY; // アニメーション無効化: previewY + Math.sin(this.t * 1.0) * 6
      const grad = ctx.createLinearGradient(x, bobY - s, x, bobY + s * 0.6);
      grad.addColorStop(0, COLORS.green);
      grad.addColorStop(1, "#1B8C4F");
      ctx.beginPath();
      ctx.moveTo(x, bobY - s * 0.7);
      ctx.lineTo(x + s, bobY + s * 0.5);
      ctx.lineTo(x - s, bobY + s * 0.5);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "#1B8C4F";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, bobY - s * 0.5);
      ctx.lineTo(x + s * 0.4, bobY + s * 0.1);
      ctx.lineTo(x - s * 0.1, bobY + s * 0.1);
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

  private drawSlider(
    cx: number,
    y: number,
    w: number,
    label: string,
    value: number,
    min: number,
    max: number,
  ): void {
    const ctx = this.ctx;
    const left = cx - w / 2;
    const ratio = (value - min) / (max - min);
    const thumbX = left + ratio * w;
    const trackH = 6;
    const thumbR = 12;

    // Label
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.dark;
    ctx.font = "13px 'Hachi Maru Pop', cursive";
    ctx.fillText(label, left, y - 16);

    // Value display
    ctx.textAlign = "right";
    ctx.fillStyle = COLORS.dark;
    ctx.globalAlpha = 0.6;
    ctx.font = "12px 'Hachi Maru Pop', cursive";
    const displayVal = Math.round(value * 100) / 100;
    ctx.fillText(`${displayVal}`, left + w, y - 16);
    ctx.globalAlpha = 1;

    // Track background
    ctx.beginPath();
    ctx.roundRect(left, y - trackH / 2, w, trackH, trackH / 2);
    ctx.fillStyle = "rgba(74,32,32,0.1)";
    ctx.fill();

    // Track filled
    ctx.beginPath();
    ctx.roundRect(left, y - trackH / 2, ratio * w, trackH, trackH / 2);
    ctx.fillStyle = COLORS.red;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;

    // Thumb shadow
    ctx.beginPath();
    ctx.arc(thumbX, y + 1, thumbR, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fill();

    // Thumb
    ctx.beginPath();
    ctx.arc(thumbX, y, thumbR, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.white;
    ctx.fill();
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
  }
}

