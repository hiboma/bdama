import Matter from "matter-js";

// ================================================================
// ビー玉サイズ
// ================================================================

/** 画面幅に応じたビー玉の半径を計算します。iPhone でも小さくなりすぎないよう下限 12px を設けます */
export function calcMarbleRadius(screenWidth: number): number {
  return Math.max(12, Math.min(17, screenWidth * 0.013));
}

// ================================================================
// 回転パラメータ定数
// ================================================================

/** くるくる（cross）の回転角速度（rad/frame） */
export const CROSS_ROTATE_SPEED = 0.02;

/** シーソー（seesaw）の揺れパラメータ */
export const SEESAW_SWAY = {
  /** 揺れの最大角度（rad） */
  maxAngle: 0.3,
};

/** C字型（ushape）の回転パラメータ */
export const USHAPE_ROTATE = {
  /** 回転角速度（rad/frame） */
  speed: 0.015,
  /** pivot の上方向オフセット比率（radius に対する） */
  pivotOffsetRatio: 0.5,
};

// ================================================================
// 回転ヘルパー関数
// ================================================================

/** くるくる（cross）を等速回転させます */
export function rotateCross(body: Matter.Body, dir: number): void {
  Matter.Body.rotate(body, CROSS_ROTATE_SPEED * dir);
}

/** シーソー（seesaw）を揺らします */
export function swaySeesaw(body: Matter.Body, elapsed: number, speed: number, phase: number): void {
  const angle = Math.sin(elapsed * speed + phase) * SEESAW_SWAY.maxAngle;
  Matter.Body.setAngle(body, angle);
}

/** C字型（ushape）を pivot を中心に等速回転させます */
export function rotateUShape(body: Matter.Body, dir: number, centerX: number, centerY: number, radius: number): void {
  const pivotX = centerX;
  const pivotY = centerY - radius * USHAPE_ROTATE.pivotOffsetRatio;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Matter.Body.rotate as any)(body, USHAPE_ROTATE.speed * dir, { x: pivotX, y: pivotY });
}

/** C字型（ushape）の回転を考慮した描画位置を計算します */
export function getUShapeDrawPosition(
  centerX: number, centerY: number, radius: number, angle: number,
): { x: number; y: number } {
  const pivotX = centerX;
  const pivotY = centerY - radius * USHAPE_ROTATE.pivotOffsetRatio;
  const dx = centerX - pivotX;
  const dy = centerY - pivotY;
  return {
    x: pivotX + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: pivotY + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
}

// ================================================================
// ボディ作成関数
// ================================================================

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

/** ベルトコンベア（belt）の速度パラメータ */
export const BELT_SPEED = {
  /** コンベアがビー玉に加える水平方向の力（mass に乗算されます） */
  force: 0.0005,
  /** 傾斜コンベアが上向き搬送するときの力の倍率 */
  upliftMultiplier: 3.5,
};

/** ベルトコンベア（belt）のボディを作成します */
export function createBeltBody(cx: number, cy: number, w: number, h: number): Matter.Body {
  return Matter.Bodies.rectangle(cx, cy, w, h, {
    isStatic: true,
    restitution: 0,
    friction: 1.0,
    label: "belt",
    render: { visible: false },
    chamfer: { radius: 2 },
  });
}

/** ベルトコンベアの搬送方向に沿った力をビー玉に加えます（回転対応） */
export function applyBeltForce(marble: Matter.Body, direction: number, angle = 0): void {
  // 搬送方向が上向き（重力に逆らう方向）の場合は力を増幅します
  const isUplift = direction * Math.sin(angle) < 0;
  const multiplier = isUplift ? BELT_SPEED.upliftMultiplier : 1;
  const f = BELT_SPEED.force * direction * marble.mass * multiplier;
  Matter.Body.applyForce(marble, marble.position, {
    x: f * Math.cos(angle),
    y: f * Math.sin(angle),
  });
}

/**
 * 傾斜コンベア上のビー玉に斜面方向の重力成分を加えます。
 * コンベアが傾いている場合、ビー玉は斜面に沿って下方向に滑ろうとします。
 * この力はコンベアの搬送力とは独立に作用します。
 */
export function applyBeltSlopeGravity(marble: Matter.Body, angle: number, gravityScale: number): void {
  // 斜面に沿った重力成分: g * sin(angle) をコンベアの面方向に分解します
  const slopeForce = gravityScale * Math.sin(angle) * marble.mass;
  Matter.Body.applyForce(marble, marble.position, {
    x: slopeForce * Math.cos(angle),
    y: slopeForce * Math.sin(angle),
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

