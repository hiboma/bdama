import Matter from "matter-js";
import { startDebugScene } from "./debug-common";
import { createTriangleBody } from "./game/ObstacleFactory";

let body: Matter.Body;
let size: number;

startDebugScene({
  name: "さんかく (triangle)",
  setup: (engine, W, H) => {
    const cx = W / 2;
    const cy = H / 2;
    size = 0.06 * W;
    body = createTriangleBody(cx, cy, size);
    Matter.Composite.add(engine.world, body);
  },
  draw: (renderer) => {
    renderer.drawTriangle(body.position.x, body.position.y, size);
  },
  hudInfo: () => [
    `位置: (${body.position.x.toFixed(0)}, ${body.position.y.toFixed(0)})`,
    `サイズ: ${size.toFixed(0)}`,
  ],
});
