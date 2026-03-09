import type Matter from "matter-js";

export interface Shelf {
  points: { x: number; y: number }[];
  bodies: Matter.Body[];
  angle: number;
  length: number;
}
