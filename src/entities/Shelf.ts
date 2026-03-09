import type Matter from "matter-js";

export interface Shelf {
  points: { x: number; y: number }[];
  bodies: Matter.Body[];
  angle: number;
  length: number;
  /** 二次ベジェ曲線の制御点（始点と終点の中間に初期配置） */
  controlPoint: { x: number; y: number };
  /** ベジェ曲線から展開したポイント列 */
  curvePoints: { x: number; y: number }[];
}
