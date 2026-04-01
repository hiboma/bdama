import Matter from "matter-js";
import { startDebugScene } from "./debug-common";
import { createBeltBody, applyBeltForce, calcMarbleRadius } from "./game/ObstacleFactory";

let beltBody: Matter.Body;
let w: number;
let h: number;
let direction = 1;
let eng: Matter.Engine;
let mRadius: number;

startDebugScene({
  name: "コンベア (belt)",
  setup: (engine, W, H) => {
    eng = engine;
    mRadius = calcMarbleRadius(W);
    const cx = W / 2;
    const cy = H / 2;
    w = 0.2 * W;
    h = 0.03 * H;
    beltBody = createBeltBody(cx, cy, w, h);
    Matter.Composite.add(engine.world, beltBody);
  },
  draw: (renderer) => {
    const elapsed = performance.now() / 1000;
    renderer.drawBelt(beltBody.position.x, beltBody.position.y, w, h, beltBody.angle, direction, elapsed);
  },
  update: (_dt: number) => {
    const bb = beltBody.bounds;
    const allBodies = Matter.Composite.allBodies(eng.world);
    for (const b of allBodies) {
      if (b.isStatic) continue;
      const mx = b.position.x;
      const my = b.position.y;
      // ビー玉の中心がコンベアの横幅内、かつ上面付近にあるとき
      if (mx > bb.min.x && mx < bb.max.x &&
          my >= bb.min.y - mRadius - 1 && my <= bb.min.y + 2) {
        applyBeltForce(b, direction);
      }
    }
  },
  toggleRotation: () => {
    direction *= -1;
  },
  hudInfo: () => [
    `位置: (${beltBody.position.x.toFixed(0)}, ${beltBody.position.y.toFixed(0)})`,
    `角度: ${(beltBody.angle * 180 / Math.PI).toFixed(1)}°`,
    `方向: ${direction > 0 ? "→" : "←"}`,
    `サイズ: ${w.toFixed(0)} x ${h.toFixed(0)}`,
  ],
});
