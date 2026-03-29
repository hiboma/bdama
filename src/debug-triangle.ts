import Matter from "matter-js";
import { startDebugScene } from "./debug-common";

let body: Matter.Body;
let size: number;

startDebugScene({
  name: "さんかく (triangle)",
  setup: (engine, W, H) => {
    const cx = W / 2;
    const cy = H / 2;
    size = 0.06 * W;
    body = Matter.Bodies.polygon(cx, cy, 3, size, {
      isStatic: true,
      restitution: 0.8,
      friction: 0.001,
      label: "triangle",
    });
    Matter.Body.rotate(body, -Math.PI / 6);
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
