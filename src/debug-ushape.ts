import Matter from "matter-js";
import { startDebugScene } from "./debug-common";
import { createUShapeBody, rotateUShape, getUShapeDrawPosition } from "./game/ObstacleFactory";

let body: Matter.Body;
let uCx: number;
let uCy: number;
let uSize: number;
let rotating = false;
let dir = 1;

startDebugScene({
  name: "ユーがた (ushape)",
  setup: (engine, W, H) => {
    uCx = W / 2;
    uCy = H / 2;
    uSize = 0.05 * W;
    body = createUShapeBody(uCx, uCy, uSize);
    Matter.Composite.add(engine.world, body);
  },
  draw: (renderer, ctx) => {
    const pos = getUShapeDrawPosition(uCx, uCy, uSize, body.angle);
    renderer.drawUShape(pos.x, pos.y, uSize, body.angle);

    // pivot マーカー（黄色）
    ctx.beginPath();
    ctx.arc(uCx, uCy - uSize * 0.5, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#FF0";
    ctx.fill();
  },
  update: () => {
    if (rotating) {
      rotateUShape(body, dir, uCx, uCy, uSize);
    }
  },
  toggleRotation: () => { rotating = !rotating; },
  hudInfo: () => [
    `center: (${uCx.toFixed(0)}, ${uCy.toFixed(0)})`,
    `角度: ${(body.angle * 180 / Math.PI).toFixed(1)}°`,
    `回転: ${rotating ? "ON" : "OFF"}`,
  ],
});
