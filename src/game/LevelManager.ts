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
    whiteballCount: 1,
    enemies: [],
    trampolines: [],
    spinPlatforms: [],
  },
  {
    level: 2,
    start: { x: 0.5, y: 0.06 },
    goal: { x: 0.15, y: 0.88 },
    maxShelves: 3,
    obstacles: [],
    bumpers: [],
    randomBumpers: 2,
    enemies: [],
    trampolines: [],
    spinPlatforms: [],
  },
  {
    level: 3,
    start: { x: 0.85, y: 0.06 },
    goal: { x: 0.1, y: 0.88 },
    maxShelves: 3,
    obstacles: [],
    bumpers: [],
    enemies: [],
    trampolines: [],
    spinPlatforms: [],
  },
  {
    level: 4,
    start: { x: 0.15, y: 0.06 },
    goal: { x: 0.5, y: 0.92 },
    maxShelves: 3,
    obstacles: [],
    bumpers: [],
    enemies: [],
    trampolines: [],
    spinPlatforms: [],
  },
  {
    level: 5,
    start: { x: 0.85, y: 0.06 },
    goal: { x: 0.12, y: 0.88 },
    maxShelves: 4,
    obstacles: [
      { x: 0.35, y: 0.3, w: 0.18, h: 0.04 },
      { x: 0.7, y: 0.52, w: 0.15, h: 0.04 },
      { x: 0.15, y: 0.65, w: 0.04, h: 0.1 },
    ],
    bumpers: [],
    enemies: [],
    trampolines: [{ x: 0.5, y: 0.82 }],
    spinPlatforms: [],
  },
  {
    level: 6,
    start: { x: 0.1, y: 0.06 },
    goal: { x: 0.88, y: 0.88 },
    maxShelves: 4,
    obstacles: [
      { x: 0.5, y: 0.35, w: 0.2, h: 0.04 },
      { x: 0.25, y: 0.55, w: 0.15, h: 0.04 },
    ],
    bumpers: [],
    enemies: [],
    trampolines: [{ x: 0.7, y: 0.7 }],
    spinPlatforms: [],
  },
  {
    level: 7,
    start: { x: 0.5, y: 0.06 },
    goal: { x: 0.5, y: 0.92 },
    maxShelves: 4,
    obstacles: [
      { x: 0.3, y: 0.28, w: 0.04, h: 0.12 },
      { x: 0.7, y: 0.28, w: 0.04, h: 0.12 },
      { x: 0.5, y: 0.55, w: 0.25, h: 0.04 },
    ],
    bumpers: [],
    enemies: [],
    trampolines: [],
    spinPlatforms: [],
  },
  {
    level: 8,
    start: { x: 0.85, y: 0.06 },
    goal: { x: 0.15, y: 0.92 },
    maxShelves: 4,
    obstacles: [
      { x: 0.5, y: 0.2, w: 0.3, h: 0.04 },
      { x: 0.3, y: 0.5, w: 0.04, h: 0.15 },
      { x: 0.65, y: 0.7, w: 0.2, h: 0.04 },
    ],
    bumpers: [],
    enemies: [],
    trampolines: [{ x: 0.8, y: 0.85 }],
    spinPlatforms: [],
  },
  {
    level: 9,
    start: { x: 0.15, y: 0.08 },
    goal: { x: 0.85, y: 0.85 },
    maxShelves: 4,
    obstacles: [
      { x: 0.6, y: 0.25, w: 0.22, h: 0.04 },
      { x: 0.35, y: 0.45, w: 0.04, h: 0.12 },
      { x: 0.75, y: 0.6, w: 0.15, h: 0.04 },
    ],
    bumpers: [],
    enemies: [],
    trampolines: [{ x: 0.2, y: 0.75 }],
    spinPlatforms: [],
  },
  {
    level: 10,
    start: { x: 0.5, y: 0.06 },
    goal: { x: 0.82, y: 0.88 },
    maxShelves: 4,
    obstacles: [
      { x: 0.2, y: 0.25, w: 0.2, h: 0.04 },
      { x: 0.78, y: 0.55, w: 0.04, h: 0.1 },
    ],
    bumpers: [],
    enemies: [{ x: 0.2, y: 0.65, type: "clown" }],
    trampolines: [{ x: 0.75, y: 0.82 }],
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

  nextLevel(): void {
    if (this.currentLevel < this.levels.length) {
      this.currentLevel++;
    }
  }

  totalLevels(): number {
    return this.levels.length;
  }
}
