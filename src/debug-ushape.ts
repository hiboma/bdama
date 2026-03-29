import Matter from "matter-js";
import { startDebugScene } from "./debug-common";
import { createUShapeBody } from "./game/ObstacleFactory";

let body: Matter.Body;
let uCx: number;
let uCy: number;
let uSize: number;
let pivotX: number;
let pivotY: number;
let rotating = false;
let dir = 1;

startDebugScene({
  name: "ユーがた (ushape)",
  setup: (engine, W, H) => {
    uCx = W / 2;
    uCy = H / 2;
    uSize = 0.05 * W;
    pivotX = uCx;
    pivotY = uCy - uSize * 0.5;
    body = createUShapeBody(uCx, uCy, uSize);
    Matter.Composite.add(engine.world, body);
  },
  draw: (renderer, ctx) => {
    // pivot オフセットを考慮して描画位置を計算します
    const angle = body.angle;
    const dx = uCx - pivotX;
    const dy = uCy - pivotY;
    const drawX = pivotX + dx * Math.cos(angle) - dy * Math.sin(angle);
    const drawY = pivotY + dx * Math.sin(angle) + dy * Math.cos(angle);
    renderer.drawUShape(drawX, drawY, uSize, angle);

    // pivot マーカー（黄色）
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#FF0";
    ctx.fill();
  },
  update: () => {
    if (rotating) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Matter.Body.rotate as any)(body, 0.015 * dir, { x: pivotX, y: pivotY });
    }
  },
  toggleRotation: () => { rotating = !rotating; },
  hudInfo: () => [
    `pivot: (${pivotX.toFixed(0)}, ${pivotY.toFixed(0)})`,
    `center: (${uCx.toFixed(0)}, ${uCy.toFixed(0)})`,
    `角度: ${(body.angle * 180 / Math.PI).toFixed(1)}°`,
    `回転: ${rotating ? "ON" : "OFF"}`,
  ],
});
