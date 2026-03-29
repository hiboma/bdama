import Matter from "matter-js";
import { startDebugScene } from "./debug-common";
import { createCrossBody, rotateCross } from "./game/ObstacleFactory";

let body: Matter.Body;
let cx: number;
let cy: number;
let size: number;
let rotating = false;
let dir = 1;

startDebugScene({
  name: "くるくる (cross)",
  setup: (engine, W, H) => {
    cx = W / 2;
    cy = H / 2;
    size = 0.06 * W;
    body = createCrossBody(cx, cy, size);
    Matter.Composite.add(engine.world, body);
  },
  draw: (renderer) => {
    renderer.drawCross(cx, cy, size, body.angle);
  },
  update: () => {
    if (rotating) {
      rotateCross(body, dir);
    }
  },
  toggleRotation: () => { rotating = !rotating; },
  hudInfo: () => [
    `位置: (${cx.toFixed(0)}, ${cy.toFixed(0)})`,
    `角度: ${(body.angle * 180 / Math.PI).toFixed(1)}°`,
    `回転: ${rotating ? "ON" : "OFF"} (方向: ${dir > 0 ? "右" : "左"})`,
  ],
});
