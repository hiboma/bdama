import Matter from "matter-js";
import { startDebugScene } from "./debug-common";
import { createBeltBody, applyBeltForce, applyBeltSlopeGravity, calcMarbleRadius } from "./game/ObstacleFactory";

let beltBody: Matter.Body;
let tiltedBeltBody: Matter.Body;
let w: number;
let h: number;
let direction = 1;
let eng: Matter.Engine;
let mRadius: number;

const TILT_ANGLE = Math.PI / 6; // 30度

startDebugScene({
  name: "コンベア (belt)",
  setup: (engine, W, H) => {
    eng = engine;
    mRadius = calcMarbleRadius(W);
    const cx = W / 2;
    const cy = H / 2 - 40;
    w = 0.2 * W;
    h = 0.03 * H;
    // 水平コンベア
    beltBody = createBeltBody(cx, cy, w, h);
    Matter.Composite.add(engine.world, beltBody);
    // 傾斜コンベア（30度）
    tiltedBeltBody = createBeltBody(cx, cy + 100, w, h);
    Matter.Body.setAngle(tiltedBeltBody, TILT_ANGLE);
    Matter.Composite.add(engine.world, tiltedBeltBody);
  },
  draw: (renderer) => {
    const elapsed = performance.now() / 1000;
    renderer.drawBelt(beltBody.position.x, beltBody.position.y, w, h, beltBody.angle, direction, elapsed);
    renderer.drawBelt(tiltedBeltBody.position.x, tiltedBeltBody.position.y, w, h, tiltedBeltBody.angle, direction, elapsed);
  },
  update: (_dt: number) => {
    const allBodies = Matter.Composite.allBodies(eng.world);
    const g = eng.gravity.y * eng.gravity.scale;
    for (const belt of [beltBody, tiltedBeltBody]) {
      const angle = belt.angle;
      const cosA = Math.cos(-angle);
      const sinA = Math.sin(-angle);
      const hw = w / 2;
      const hh = h / 2;
      for (const b of allBodies) {
        if (b.isStatic) continue;
        const dx = b.position.x - belt.position.x;
        const dy = b.position.y - belt.position.y;
        const localX = dx * cosA - dy * sinA;
        const localY = dx * sinA + dy * cosA;
        if (Math.abs(localX) < hw && localY >= -hh - mRadius - 1 && localY <= -hh + 2) {
          applyBeltForce(b, direction, angle);
          if (angle !== 0) {
            applyBeltSlopeGravity(b, angle, g);
          }
        }
      }
    }
  },
  toggleRotation: () => {
    direction *= -1;
  },
  hudInfo: () => [
    `水平: (${beltBody.position.x.toFixed(0)}, ${beltBody.position.y.toFixed(0)}) ${(beltBody.angle * 180 / Math.PI).toFixed(1)}°`,
    `傾斜: (${tiltedBeltBody.position.x.toFixed(0)}, ${tiltedBeltBody.position.y.toFixed(0)}) ${(tiltedBeltBody.angle * 180 / Math.PI).toFixed(1)}°`,
    `方向: ${direction > 0 ? "→" : "←"}`,
    `サイズ: ${w.toFixed(0)} x ${h.toFixed(0)}`,
  ],
});

