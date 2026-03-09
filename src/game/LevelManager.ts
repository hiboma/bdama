export interface ObstacleData {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BumperData {
  x: number;
  y: number;
  r: number;
}

export interface TriangleData {
  x: number;
  y: number;
  size: number;
}

export interface CrossData {
  x: number;
  y: number;
  size: number;
}

export interface LevelData {
  level: number;
  start: { x: number; y: number };
  goal: { x: number; y: number };
  maxShelves: number;
  obstacles: ObstacleData[];
  randomObstacles?: number;
  bumpers: BumperData[];
  randomBumpers?: number;
  whiteballCount?: number;
  enemies: { x: number; y: number; type: string }[];
  trampolines: { x: number; y: number }[];
  spinPlatforms: { x: number; y: number }[];
}

const LEVELS: LevelData[] = [
  {
    level: 1,
    start: { x: 0.1, y: 0.08 },
    goal: { x: 0.85, y: 0.88 },
    maxShelves: 3,
    obstacles: [],
    randomObstacles: 2,
    bumpers: [],
    randomBumpers: 2,
    whiteballCount: 1,
    enemies: [],
    trampolines: [],
    spinPlatforms: [],
  },
];

export class LevelManager {
  currentLevel = 1;
  private levels: LevelData[] = LEVELS;

  loadLevel(n: number): void {
    this.currentLevel = Math.min(n, this.levels.length);
  }

  current(): LevelData | null {
    return this.levels[this.currentLevel - 1] ?? null;
  }

  totalLevels(): number {
    return this.levels.length;
  }
}
