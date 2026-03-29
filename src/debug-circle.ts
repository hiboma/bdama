import Matter from "matter-js";
import { startDebugScene } from "./debug-common";
import { createBumperBody } from "./game/ObstacleFactory";

let body: Matter.Body;
let r: number;

startDebugScene({
  name: "まる (circle)",
  setup: (engine, W, H) => {
    const cx = W / 2;
    const cy = H / 2;
    r = 0.05 * W;
    body = createBumperBody(cx, cy, r);
    Matter.Composite.add(engine.world, body);
  },
  draw: (renderer) => {
    renderer.drawBumper(body.position.x, body.position.y, r);
  },
  hudInfo: () => [
    `位置: (${body.position.x.toFixed(0)}, ${body.position.y.toFixed(0)})`,
    `半径: ${r.toFixed(0)}`,
  ],
});
