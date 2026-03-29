import Matter from "matter-js";

/** しかく（rect）のボディを作成します */
export function createObstacleBody(cx: number, cy: number, w: number, h: number): Matter.Body {
  return Matter.Bodies.rectangle(cx, cy, w, h, {
    isStatic: true,
    friction: 0.001,
    restitution: 0.2,
    label: "obstacle",
    render: { visible: false },
    chamfer: { radius: 3 },
  });
}

/** まる（circle）のボディを作成します */
export function createBumperBody(cx: number, cy: number, r: number): Matter.Body {
  return Matter.Bodies.circle(cx, cy, r, {
    isStatic: true,
    restitution: 1.2,
    friction: 0.001,
    label: "bumper",
    render: { visible: false },
  });
}

/** さんかく（triangle）のボディを作成します。上を向いた正三角形になります */
export function createTriangleBody(cx: number, cy: number, size: number): Matter.Body {
  const body = Matter.Bodies.polygon(cx, cy, 3, size, {
    isStatic: true,
    restitution: 0.8,
    friction: 0.001,
    label: "triangle",
    render: { visible: false },
  });
  // Matter.Bodies.polygon のデフォルトは左を向いた三角形なので -30度回転します
  Matter.Body.rotate(body, -Math.PI / 6);
  return body;
}

/** くるくる（cross）のボディを作成します */
export function createCrossBody(cx: number, cy: number, size: number): Matter.Body {
  const armLen = size * 2;
  const armW = size * 0.4;

  const horizontal = Matter.Bodies.rectangle(cx, cy, armLen, armW, {
    render: { visible: false },
  });
  const vertical = Matter.Bodies.rectangle(cx, cy, armW, armLen, {
    render: { visible: false },
  });
  return Matter.Body.create({
    parts: [horizontal, vertical],
    isStatic: true,
    restitution: 0.6,
    friction: 0.001,
    label: "cross",
    render: { visible: false },
  });
}

/** シーソー（seesaw）のボディを作成します */
export function createSeesawBody(cx: number, cy: number, w: number, h: number): Matter.Body {
  return Matter.Bodies.rectangle(cx, cy, w, h, {
    isStatic: true,
    restitution: 0.4,
    friction: 0.5,
    label: "seesaw",
    render: { visible: false },
    chamfer: { radius: 2 },
  });
}

/** C字型（ushape）の円弧パラメータ */
export const USHAPE_ARC = {
  /** 開口部の半角（上向き開口、ラジアン） */
  gapHalfAngle: Math.PI * 0.25,
  /** 円弧を構成するセグメント数 */
  segments: 12,
  /** 壁の太さの比率（radius に対する） */
  wallRatio: 0.2,
};

/** C字型（ushape）のボディを作成します。(cx, cy) が円の中心になります */
export function createUShapeBody(cx: number, cy: number, size: number): Matter.Body {
  const radius = size;
  const wallThick = size * USHAPE_ARC.wallRatio;
  const gap = USHAPE_ARC.gapHalfAngle;
  const segments = USHAPE_ARC.segments;

  // 開口部を上に向けます: -π/2 を中心に gap 分の隙間を空けます
  const startAngle = -Math.PI / 2 + gap;
  const endAngle = -Math.PI / 2 + Math.PI * 2 - gap;
  const arcSpan = endAngle - startAngle;
  const segAngle = arcSpan / segments;
  const segLen = 2 * radius * Math.sin(segAngle / 2);

  const parts: Matter.Body[] = [];
  for (let i = 0; i < segments; i++) {
    const midAngle = startAngle + segAngle * (i + 0.5);
    const px = cx + Math.cos(midAngle) * radius;
    const py = cy + Math.sin(midAngle) * radius;
    const seg = Matter.Bodies.rectangle(px, py, segLen, wallThick, {
      angle: midAngle,
      render: { visible: false },
    });
    parts.push(seg);
  }

  return Matter.Body.create({
    parts,
    isStatic: true,
    restitution: 0.4,
    friction: 0.01,
    label: "ushape",
    render: { visible: false },
  });
}

