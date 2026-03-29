import Matter from "matter-js";

/** U字型ボディを作成して返します。(cx, cy) が底の中心になります */
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

/** U字型ボディを pivot を中心に回転させます */
export function rotateUShapeAroundPivot(
  body: Matter.Body,
  newAngle: number,
  pivotX: number,
  pivotY: number,
): void {
  const deltaAngle = newAngle - body.angle;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Matter.Body.rotate as any)(body, deltaAngle, { x: pivotX, y: pivotY });
}
