import Matter from "matter-js";
import { startDebugScene } from "./debug-common";
import { createUShapeBody } from "./game/ObstacleFactory";

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
    renderer.drawUShape(uCx, uCy, uSize, body.angle);

    // pivot マーカー（黄色）
    ctx.beginPath();
    ctx.arc(uCx, uCy, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#FF0";
    ctx.fill();
  },
  update: () => {
    if (rotating) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Matter.Body.rotate as any)(body, 0.015 * dir, { x: uCx, y: uCy });
    }
  },
  toggleRotation: () => { rotating = !rotating; },
  hudInfo: () => [
    `pivot: (${uCx.toFixed(0)}, ${uCy.toFixed(0)})`,
    `body.pos: (${body.position.x.toFixed(0)}, ${body.position.y.toFixed(0)})`,
    `角度: ${(body.angle * 180 / Math.PI).toFixed(1)}°`,
    `回転: ${rotating ? "ON" : "OFF"}`,
  ],
});
