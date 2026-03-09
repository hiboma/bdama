import type Matter from "matter-js";

export interface Shelf {
  /** ドラッグ可能なアンカーポイント列（始点・中間点・終点） */
  anchors: { x: number; y: number }[];
  bodies: Matter.Body[];
  angle: number;
  length: number;
  /** アンカー間をスプライン補間した描画用ポイント列 */
  curvePoints: { x: number; y: number }[];
}
