import Matter from "matter-js";
import { Renderer } from "./game/Renderer";
import { calcMarbleRadius } from "./game/ObstacleFactory";

export interface DebugSceneConfig {
  /** 障害物名（HUD 表示用） */
  name: string;
  /** 障害物ボディを作成して world に追加する。描画に必要な情報を返す */
  setup: (engine: Matter.Engine, W: number, H: number) => void;
  /** 毎フレームの描画処理 */
  draw: (renderer: Renderer, ctx: CanvasRenderingContext2D) => void;
  /** 毎フレームの更新処理（回転アニメーション等） */
  update?: (dt: number, elapsed: number) => void;
  /** 回転開始/停止のトグル */
  toggleRotation?: () => void;
  /** HUD に追加情報を表示する */
  hudInfo?: () => string[];
}

export function startDebugScene(config: DebugSceneConfig): void {
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

  const marbleRadius = calcMarbleRadius(W);
  const renderer = new Renderer(ctx);
  const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.2, scale: 0.001 } });

  // 障害物をセットアップ
  config.setup(engine, W, H);

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
    const marble = Matter.Bodies.circle(x, y, marbleRadius, {
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
    dropMarble(x, Math.min(y, H * 0.4));
  });

  // キーボード操作
  window.addEventListener("keydown", (e) => {
    if (e.key === "r" || e.key === "R") reset();
    if (e.key === " " && config.toggleRotation) {
      config.toggleRotation();
      e.preventDefault();
    }
  });

  // 物理ボディのワイヤーフレーム描画
  function drawPhysicsBodies(): void {
    const bodies = Matter.Composite.allBodies(engine.world);
    for (const body of bodies) {
      if (body.label === "wall" || body.label === "floor") continue;
      if (!body.parts || body.parts.length <= 1) {
        const verts = body.vertices;
        ctx.strokeStyle = "rgba(0,255,0,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(verts[0]!.x, verts[0]!.y);
        for (let j = 1; j < verts.length; j++) ctx.lineTo(verts[j]!.x, verts[j]!.y);
        ctx.closePath();
        ctx.stroke();
      } else {
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
    const lines = [`[${config.name}] ボール: ${marbles.length}`];
    if (config.hudInfo) lines.push(...config.hudInfo());

    const panelH = 16 + lines.length * 16;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(8, 8, 360, panelH);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, 360, panelH);

    ctx.font = "12px monospace";
    ctx.fillStyle = "#eee";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i]!, 16, 28 + i * 16);
    }

    // 操作説明
    ctx.fillStyle = "#888";
    ctx.font = "11px monospace";
    const controls = config.toggleRotation
      ? "クリック: ボール落下 / Space: 回転 / R: リセット"
      : "クリック: ボール落下 / R: リセット";
    ctx.fillText(controls, 16, H - 16);

    // ナビゲーション
    ctx.fillStyle = "#88f";
    ctx.font = "11px monospace";
    ctx.fillText("← /bdama/debug.html", W - 170, H - 16);

    ctx.restore();
  }

  // メインループ
  let lastTime = performance.now();
  let elapsed = 0;

  function loop(): void {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    elapsed += dt;

    Matter.Engine.update(engine, dt * 1000);
    if (config.update) config.update(dt, elapsed);

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

    // 障害物描画
    config.draw(renderer, ctx);

    // ビー玉描画
    for (const m of marbles) {
      const colorIdx = marbleColors.get(m.id) ?? 2;
      renderer.drawMarble(m.position.x, m.position.y, marbleRadius, colorIdx);
    }

    // 物理ボディワイヤーフレーム
    drawPhysicsBodies();

    // HUD
    drawHUD();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
