import Matter from "matter-js";
import { Renderer } from "./game/Renderer";
import { createUShapeBody, rotateUShapeAroundPivot } from "./game/UShape";

const canvasEl = document.getElementById("debug-canvas");
if (!canvasEl) throw new Error("debug-canvas not found");
const canvas = canvasEl as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// 本番と同じ DPR 対応リサイズ
const dpr = window.devicePixelRatio || 1;
const W = window.innerWidth;
const H = window.innerHeight;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = `${W}px`;
canvas.style.height = `${H}px`;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const MARBLE_RADIUS = 17;
const renderer = new Renderer(ctx);
const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.2, scale: 0.001 } });

// U字型（画面中央、本番と同じ比率）
const uSize = 0.05 * W; // 本番の生成と同程度のサイズ
const uCx = W / 2;
const uCy = H / 2;
const uBody = createUShapeBody(uCx, uCy, uSize);
Matter.Composite.add(engine.world, uBody);

// 壁と床
const wallThickness = 20;
const walls = [
  Matter.Bodies.rectangle(-wallThickness / 2, H / 2, wallThickness, H * 2, { isStatic: true, label: "wall" }),
  Matter.Bodies.rectangle(W + wallThickness / 2, H / 2, wallThickness, H * 2, { isStatic: true, label: "wall" }),
  Matter.Bodies.rectangle(W / 2, H + wallThickness / 2, W, wallThickness, { isStatic: true, label: "floor" }),
];
for (const w of walls) Matter.Composite.add(engine.world, w);

// ビー玉管理
let marbles: Matter.Body[] = [];
const marbleColors: Map<number, number> = new Map();

function dropMarble(x: number, y: number): void {
  const marble = Matter.Bodies.circle(x, y, MARBLE_RADIUS, {
    restitution: 0.5,
    friction: 0.001,
    density: 0.002,
    label: "marble",
  });
  Matter.Composite.add(engine.world, marble);
  marbles.push(marble);
  marbleColors.set(marble.id, Math.floor(Math.random() * 7));
}

function reset(): void {
  for (const m of marbles) Matter.Composite.remove(engine.world, m);
  marbles = [];
  marbleColors.clear();
}

// クリックでボール落下
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);
  if (y < uCy - uSize * 3 - 30) {
    dropMarble(x, y);
  } else {
    dropMarble(x, 30);
  }
});

// 物理ボディのワイヤーフレーム描画
function drawPhysicsBodies(): void {
  const bodies = Matter.Composite.allBodies(engine.world);
  for (const body of bodies) {
    if (body.label === "wall" || body.label === "floor") continue;
    if (!body.parts || body.parts.length <= 1) {
      // 単体ボディ
      const verts = body.vertices;
      ctx.strokeStyle = "rgba(0,255,0,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(verts[0]!.x, verts[0]!.y);
      for (let j = 1; j < verts.length; j++) ctx.lineTo(verts[j]!.x, verts[j]!.y);
      ctx.closePath();
      ctx.stroke();
    } else {
      // Composite body のパーツ
      for (let p = 1; p < body.parts.length; p++) {
        const part = body.parts[p]!;
        const verts = part.vertices;
        ctx.strokeStyle = "rgba(255,100,100,0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(verts[0]!.x, verts[0]!.y);
        for (let j = 1; j < verts.length; j++) ctx.lineTo(verts[j]!.x, verts[j]!.y);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
}

// HUD 描画
function drawHUD(): void {
  ctx.save();

  // 半透明パネル
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(8, 8, 340, 80);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, 340, 80);

  ctx.font = "12px monospace";
  ctx.fillStyle = "#eee";
  ctx.fillText(`ボール: ${marbles.length}`, 16, 28);
  ctx.fillText(`pivot: (${uCx.toFixed(0)}, ${uCy.toFixed(0)})`, 16, 44);
  ctx.fillText(`body.pos: (${uBody.position.x.toFixed(0)}, ${uBody.position.y.toFixed(0)})`, 16, 60);
  ctx.fillText(`角度: ${(uBody.angle * 180 / Math.PI).toFixed(1)}°`, 16, 76);
  ctx.fillText(`回転: ${rotating ? "ON" : "OFF"}`, 200, 28);

  // 操作説明
  ctx.fillStyle = "#888";
  ctx.font = "11px monospace";
  ctx.fillText("クリック: ボール落下 / Space: 回転 / R: リセット", 16, H - 16);

  // トップに戻るリンク
  ctx.fillStyle = "#88f";
  ctx.font = "11px monospace";
  ctx.fillText("← /bdama/ に戻る", W - 150, H - 16);

  ctx.restore();
}

// pivot マーカー
function drawPivotMarker(): void {
  // 黄色: pivot（底の中心、回転の中心）
  ctx.beginPath();
  ctx.arc(uCx, uCy, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#FF0";
  ctx.fill();

  // 水色: body.position（Matter.js 自動重心）
  ctx.beginPath();
  ctx.arc(uBody.position.x, uBody.position.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#0FF";
  ctx.fill();
}

// 回転アニメーション状態
let rotating = false;
let elapsed = 0;

// キーボード操作
window.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") reset();
  if (e.key === " ") { rotating = !rotating; e.preventDefault(); }
});

// メインループ
let lastTime = performance.now();
function loop(): void {
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  Matter.Engine.update(engine, dt * 1000);

  // U字型の回転（スペースキーで開始/停止）
  if (rotating) {
    elapsed += dt;
    const newAngle = Math.sin(elapsed * 0.5) * Math.PI;
    rotateUShapeAroundPivot(uBody, newAngle, uCx, uCy);
  }

  // 画面外のビー玉を除去
  marbles = marbles.filter((m) => {
    if (m.position.y > H + 100 || m.position.y < -200) {
      Matter.Composite.remove(engine.world, m);
      marbleColors.delete(m.id);
      return false;
    }
    return true;
  });

  // 描画
  ctx.clearRect(0, 0, W, H);

  // 背景（本番と同じクリーム色 + ストライプ）
  ctx.fillStyle = "#FFF8E1";
  ctx.fillRect(0, 0, W, H);
  for (let gx = 0; gx < W; gx += 40) {
    ctx.fillStyle = "rgba(231,76,60,0.04)";
    ctx.fillRect(gx + 20, 0, 20, H);
  }

  // U字型描画（本番の Renderer を使用）
  renderer.drawUShape(uCx, uCy, uSize, uBody.angle);

  // ビー玉描画（本番の Renderer を使用）
  for (const m of marbles) {
    const colorIdx = marbleColors.get(m.id) ?? 2;
    renderer.drawMarble(m.position.x, m.position.y, MARBLE_RADIUS, colorIdx);
  }

  // 物理ボディワイヤーフレーム（デフォルト表示）
  drawPhysicsBodies();

  // pivot マーカー
  drawPivotMarker();

  // HUD
  drawHUD();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
