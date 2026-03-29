import Matter from "matter-js";
import { startDebugScene } from "./debug-common";
import { createSeesawBody } from "./game/ObstacleFactory";

let body: Matter.Body;
let w: number;
let h: number;
let rotating = false;
let elapsed = 0;

startDebugScene({
  name: "シーソー (seesaw)",
  setup: (engine, W, H) => {
    const cx = W / 2;
    const cy = H / 2;
    w = 0.2 * W;
    h = 0.03 * H;
    body = createSeesawBody(cx, cy, w, h);
    Matter.Composite.add(engine.world, body);
  },
  draw: (renderer) => {
    renderer.drawSeesaw(body.position.x, body.position.y, w, h, body.angle);
  },
  update: (dt) => {
    if (rotating) {
      elapsed += dt;
      const angle = Math.sin(elapsed * 0.8) * 0.3;
      Matter.Body.setAngle(body, angle);
    }
  },
  toggleRotation: () => { rotating = !rotating; },
  hudInfo: () => [
    `位置: (${body.position.x.toFixed(0)}, ${body.position.y.toFixed(0)})`,
    `角度: ${(body.angle * 180 / Math.PI).toFixed(1)}°`,
    `回転: ${rotating ? "ON" : "OFF"}`,
    `サイズ: ${w.toFixed(0)} x ${h.toFixed(0)}`,
  ],
});
