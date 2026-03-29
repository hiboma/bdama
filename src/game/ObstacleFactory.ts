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

/** U字型（ushape）のボディを作成します。(cx, cy) が底の中心になります */
export function createUShapeBody(cx: number, cy: number, size: number): Matter.Body {
  const wallH = size * 3;
  const wallW = size * 0.3;
  const bottomW = size * 2.5;
  const bottomH = wallW;
  const halfSpan = (bottomW - wallW) / 2;

  const leftWall = Matter.Bodies.rectangle(cx - halfSpan, cy - wallH / 2, wallW, wallH, {
    render: { visible: false },
  });
  const rightWall = Matter.Bodies.rectangle(cx + halfSpan, cy - wallH / 2, wallW, wallH, {
    render: { visible: false },
  });
  const bottom = Matter.Bodies.rectangle(cx, cy, bottomW, bottomH, {
    render: { visible: false },
  });
  return Matter.Body.create({
    parts: [leftWall, rightWall, bottom],
    isStatic: true,
    restitution: 0.4,
    friction: 0.01,
    label: "ushape",
    render: { visible: false },
  });
}

