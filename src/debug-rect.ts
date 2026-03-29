import Matter from "matter-js";
import { startDebugScene } from "./debug-common";

let body: Matter.Body;
let cx: number;
let cy: number;
let w: number;
let h: number;

startDebugScene({
  name: "しかく (rect)",
  setup: (engine, W, H) => {
    cx = W / 2;
    cy = H / 2;
    w = 0.15 * W;
    h = 0.04 * H;
    body = Matter.Bodies.rectangle(cx, cy, w, h, {
      isStatic: true,
      friction: 0.001,
      restitution: 0.2,
      label: "obstacle",
      chamfer: { radius: 3 },
    });
    Matter.Composite.add(engine.world, body);
  },
  draw: (renderer) => {
    renderer.drawDrum(body.position.x, body.position.y, w, h, -1, body.angle);
  },
  hudInfo: () => [
    `位置: (${body.position.x.toFixed(0)}, ${body.position.y.toFixed(0)})`,
    `角度: ${(body.angle * 180 / Math.PI).toFixed(1)}°`,
    `サイズ: ${w.toFixed(0)} x ${h.toFixed(0)}`,
  ],
});
