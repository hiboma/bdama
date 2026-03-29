import Matter from "matter-js";
import { Renderer } from "./Renderer";
import { Input } from "./Input";
import { LevelManager } from "./LevelManager";
import type { ObstacleData, BumperData, TriangleData, CrossData, SeesawData, UShapeData } from "./LevelManager";
import type { Shelf } from "../entities/Shelf";
import { Sound } from "./Sound";
import { createUShapeBody, rotateUShapeAroundPivot } from "./UShape";

export type GameState = "title" | "playing" | "drawing" | "rolling" | "clear" | "fail";
export type GameMode = "drawing" | "tsumiki";
export type ObstacleType = "rect" | "circle" | "triangle" | "cross" | "seesaw" | "ushape";

export interface GoalEffect {
  x: number;
  y: number;
  score: number;
  age: number;
  particles: { x: number; y: number; vx: number; vy: number; color: string }[];
}

export interface BreakEffect {
  x: number;
  y: number;
  age: number;
  particles: { x: number; y: number; vx: number; vy: number; size: number; color: string }[];
}

const TIME_LIMIT = 30;
const TIME_LIMIT_TSUMIKI = 60;
// 速度ステップ: 0=おそい, 1=ふつう(1x), 2=はやい(2x), 3=もっと(3x)
const SPEED_STEPS = [0.2, 0.4, 0.8, 1.2];
// はずみやすさステップ: 0=ぺたり, 1=すこし, 2=ふつう, 3=すごく
const RESTITUTION_STEPS = [0.1, 0.3, 0.5, 1.0];
const MARBLE_RADIUS = 17;
const MARBLE_COLORS = [
  "#F44336", "#FF9800", "#FFC107", "#4CAF50", "#2196F3", "#7E57C2", "#E91E63", "#D8D8D8",
];
const SHELF_SEGMENT_LENGTH = 20;

// mulberry32 シード付き疑似乱数生成器
function createSeededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Color index: 0=Red, 1=Orange, 2=Yellow, 3=Green, 4=Blue, 5=Indigo, 6=Violet
// Each: { restitution, density, friction, label }
const MARBLE_TRAITS: { restitution: number; density: number; friction: number; label: string }[] = [
  { restitution: 0.9,  density: 0.001,  friction: 0.001, label: "はねる" },    // Red: bouncy & light
  { restitution: 0.7,  density: 0.0015, friction: 0.001, label: "はやい" },    // Orange: fast
  { restitution: 0.5,  density: 0.002,  friction: 0.001, label: "ふつう" },    // Yellow: standard
  { restitution: 0.4,  density: 0.003,  friction: 0.001, label: "おもい" },    // Green: heavy
  { restitution: 0.3,  density: 0.004,  friction: 0.001, label: "ずっしり" },  // Blue: very heavy
  { restitution: 0.6,  density: 0.001,  friction: 0.001, label: "すべる" },    // Indigo: slippery
  { restitution: 0.8,  density: 0.0008, friction: 0.001, label: "スーパー" },  // Violet: super bouncy
];

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: Matter.Engine;
  private renderer: Renderer;
  private input: Input;
  private levelManager: LevelManager;
  private state: GameState = "title";
  private gameMode: GameMode = "drawing";
  private tsumikiFreeMode = false;
  private shelves: Shelf[] = [];
  private marbles: Matter.Body[] = [];
  private goalSensor: Matter.Body | null = null;
  private staticBodies: Matter.Body[] = [];
  private width = 0;
  private height = 0;
  private timeRemaining = TIME_LIMIT;
  private timerStarted = false;
  private lastTimestamp = 0;
  private speedStep = 1;
  private restitutionStep = 2;

  private goalsScored = 0;
  private goalEffects: GoalEffect[] = [];
  private breakEffects: BreakEffect[] = [];
  private marbleColors: Map<number, number> = new Map();
  private marbleTaps: Map<number, number> = new Map();
  private generatedObstacles: ObstacleData[] = [];
  private whiteBalls: Matter.Body[] = [];
  private whiteballHitBy: Set<number> = new Set();
  private obstacleHitTimes: Map<number, number> = new Map();
  private obstacleBodies: Matter.Body[] = [];
  private generatedBumpers: BumperData[] = [];
  private bumperBodies: Matter.Body[] = [];
  private bumperHitTimes: Map<number, number> = new Map();
  private generatedTriangles: TriangleData[] = [];
  private triangleBodies: Matter.Body[] = [];
  private triangleHitTimes: Map<number, number> = new Map();
  private generatedCrosses: CrossData[] = [];
  private crossBodies: Matter.Body[] = [];
  private crossHitTimes: Map<number, number> = new Map();
  private crossDirections: number[] = [];
  private generatedSeesaws: SeesawData[] = [];
  private seesawBodies: Matter.Body[] = [];
  private seesawHitTimes: Map<number, number> = new Map();
  private seesawPhases: number[] = [];
  private seesawSpeeds: number[] = [];
  private generatedUShapes: UShapeData[] = [];
  private uShapeBodies: Matter.Body[] = [];
  private uShapeHitTimes: Map<number, number> = new Map();
  private uShapeDirections: number[] = [];
  private uShapePhases: number[] = [];
  private obstaclePivots: ("center" | "left" | "right")[] = [];
  private obstacleBasePositions: { x: number; y: number }[] = [];
  private obstaclePhases: number[] = [];
  private obstacleSpeeds: number[] = [];
  private bumperPhases: number[] = [];
  private bumperBaseSizes: number[] = [];
  private trianglePhases: number[] = [];
  private triangleBasePositions: { x: number; y: number }[] = [];
  private elapsed = 0;
  private selectedObstacles: Set<ObstacleType> = new Set();
  private marbleHits: Map<number, number> = new Map();
  private marblesFallen = 0;
  private seed: number | null = null;
  private seededRandom: (() => number) | null = null;
  private sound = new Sound();
  private draggingShelfIndex = -1;
  private draggingAnchorIndex = -1;
  private levelStartTime = 0;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  // 積み木モード用プロパティ
  private tsumikiShelves: { x: number; y: number; length: number; angle: number; body: Matter.Body | null; moved: boolean }[] = [];
  private tsumikiSelectedIndex = -1; // 選択中のパーツのインデックス（-1:なし, 0〜:障害物, 1000〜:棚）
  private tsumikiSelectedType: "obstacle" | "bumper" | "triangle" | "cross" | "seesaw" | "ushape" | "shelf" | null = null;
  private tsumikiRotating = false;
  private tsumikiRotateCenter: { x: number; y: number } | null = null;
  private tsumikiDragging = false;
  private tsumikiDragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private tsumikiPhaseTransitionAge = 0; // フェーズ切り替えアニメーション用
  private tsumikiMovedParts: Set<string> = new Set(); // "type:index" 形式で移動したパーツを記録
  private longPressShelfIndex = -1;
  private longPressProgress = 0;
  private longPressStartTime = 0;
  private onReturnToTitle: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.2, scale: 0.001 },
    });
    this.renderer = new Renderer(this.ctx);
    this.input = new Input(canvas);
    this.levelManager = new LevelManager();
    this.setupCollisionListener();
    this.parseSeed();
    this.loadSettings();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(): void {
    this.state = "title";
    this.setupInputAndLoop();
  }

  /** HTML タイトル画面から設定を受け取ってゲームを開始します */
  startWithConfig(config: {
    gameMode: GameMode;
    selectedObstacles: Set<ObstacleType>;
    speedStep: number;
    restitutionStep: number;
    tsumikiFreeMode: boolean;
    onReturnToTitle: () => void;
  }): void {
    this.gameMode = config.gameMode;
    this.selectedObstacles = config.selectedObstacles;
    this.speedStep = config.speedStep;
    this.restitutionStep = config.restitutionStep;
    this.tsumikiFreeMode = config.tsumikiFreeMode;
    this.onReturnToTitle = config.onReturnToTitle;
    this.resize();
    this.setupInputAndLoop();

    // ゲーム開始
    this.state = "playing";
    this.levelManager.loadLevel(1);
    this.randomizeStartGoalX();
    this.shelves = [];
    this.timeRemaining = this.gameMode === "tsumiki" ? TIME_LIMIT_TSUMIKI : TIME_LIMIT;
    this.timerStarted = false;
    this.levelStartTime = performance.now();
    this.generateObstacles();
    this.setupObstaclesAndWhiteBalls();
    if (this.gameMode === "tsumiki") {
      this.generateTsumikiShelves();
    }
  }

  private setupInputAndLoop(): void {
    this.input.onTap((x, y, holdDuration) => this.handleTap(x, y, holdDuration));
    this.input.onDrawEnd((points) => this.handleDrawEnd(points));
    this.input.onDragStart((x, y) => this.handleDragStart(x, y));
    this.input.onDragMove((x, y) => this.handleDragMove(x, y));
    this.input.onDragEnd(() => this.handleDragEnd());
    // デバッグ用: スペースキーでビー玉を転がします
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        if (this.state === "playing" || this.state === "drawing" || this.state === "rolling") {
          this.sound.roll();
          this.addMarble();
        }
      }
    });

    this.lastTimestamp = performance.now();
    this.loop();
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.elapsed += dt;
    if (this.timerStarted && this.state !== "clear" && this.state !== "fail" && this.state !== "title") {
      this.timeRemaining -= dt;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.cleanupPhysics();
        if (this.goalsScored > 0) {
          this.state = "clear";
          this.sound.clear();
        } else {
          this.state = "fail";
          this.sound.fail();
        }
        return;
      }
    }

    if (this.state === "rolling") {
      const timeScale = SPEED_STEPS[this.speedStep]! / SPEED_STEPS[1]!;
      // トンネリング防止: 1回の更新量が基準(1000/60 ≈ 16.7ms)を超える場合は分割します
      const baseDt = 1000 / 60;
      const totalDt = baseDt * timeScale;
      const subSteps = Math.ceil(timeScale);
      const stepDt = totalDt / subSteps;
      for (let i = 0; i < subSteps; i++) {
        Matter.Engine.update(this.engine, stepDt);
      }
      this.checkGoal();
      this.checkOutOfBounds();
    }

    // しかく障害物をゆらゆら揺らします
    // TODO: 設定で有効/無効を切り替えられるようにする
    // if (this.state === "playing" || this.state === "drawing" || this.state === "rolling") {
    //   const MAX_ANGLE = (20 * Math.PI) / 180;
    //   for (let i = 0; i < this.obstacleBodies.length; i++) {
    //     const body = this.obstacleBodies[i]!;
    //     const base = this.obstacleBasePositions[i]!;
    //     const pivot = this.obstaclePivots[i]!;
    //     const phase = this.obstaclePhases[i]!;
    //     const speed = this.obstacleSpeeds[i]!;
    //     const angle = Math.sin(this.elapsed * speed + phase) * MAX_ANGLE;
    //     const obs = this.generatedObstacles[i]!;
    //     const halfW = (obs.w * this.width) / 2;
    //
    //     let px = base.x;
    //     const py = base.y;
    //     if (pivot === "left") px = base.x - halfW;
    //     else if (pivot === "right") px = base.x + halfW;
    //
    //     const dx = base.x - px;
    //     const dy = base.y - py;
    //     const cos = Math.cos(angle);
    //     const sin = Math.sin(angle);
    //     const newX = px + dx * cos - dy * sin;
    //     const newY = py + dx * sin + dy * cos;
    //
    //     Matter.Body.setAngle(body, angle);
    //     Matter.Body.setPosition(body, { x: newX, y: newY });
    //   }
    // }

    // まるの障害物を大きくなったり小さくなったりさせます
    // TODO: 設定で有効/無効を切り替えられるようにする
    // if (this.state === "playing" || this.state === "drawing" || this.state === "rolling") {
    //   for (let i = 0; i < this.bumperBodies.length; i++) {
    //     const body = this.bumperBodies[i]!;
    //     const phase = this.bumperPhases[i]!;
    //     const baseR = this.bumperBaseSizes[i]!;
    //     const scale = 1 + Math.sin(this.elapsed * 1.2 + phase) * 0.3;
    //     const currentR = baseR * scale;
    //     const currentScale = currentR / (body.circleRadius ?? baseR);
    //     Matter.Body.scale(body, currentScale, currentScale);
    //   }
    // }

    // さんかくの障害物を上下に動かします
    // TODO: 設定で有効/無効を切り替えられるようにする
    // if (this.state === "playing" || this.state === "drawing" || this.state === "rolling") {
    //   for (let i = 0; i < this.triangleBodies.length; i++) {
    //     const body = this.triangleBodies[i]!;
    //     const base = this.triangleBasePositions[i]!;
    //     const phase = this.trianglePhases[i]!;
    //     const offsetY = Math.sin(this.elapsed * 1.0 + phase) * 40;
    //     Matter.Body.setPosition(body, { x: base.x, y: base.y + offsetY });
    //   }
    // }

    // クロス障害物は常に回転させます
    if (this.state === "playing" || this.state === "drawing" || this.state === "rolling") {
      for (let i = 0; i < this.crossBodies.length; i++) {
        const dir = this.crossDirections[i] ?? 1;
        Matter.Body.rotate(this.crossBodies[i]!, 0.02 * dir);
      }
    }

    // シーソーをゆらゆら揺らします
    if (this.state === "playing" || this.state === "drawing" || this.state === "rolling") {
      for (let i = 0; i < this.seesawBodies.length; i++) {
        const phase = this.seesawPhases[i] ?? 0;
        const speed = this.seesawSpeeds[i] ?? 0.8;
        const angle = Math.sin(this.elapsed * speed + phase) * 0.3;
        Matter.Body.setAngle(this.seesawBodies[i]!, angle);
      }
    }

    // U字型障害物は底の中心を pivot にして振り子回転を行います
    if (this.state === "playing" || this.state === "drawing" || this.state === "rolling") {
      for (let i = 0; i < this.uShapeBodies.length; i++) {
        const us = this.generatedUShapes[i]!;
        const dir = this.uShapeDirections[i] ?? 1;
        const phase = this.uShapePhases[i] ?? 0;
        const newAngle = Math.sin(this.elapsed * 0.5 + phase) * Math.PI * dir;
        rotateUShapeAroundPivot(this.uShapeBodies[i]!, newAngle, us.x * this.width, us.y * this.height);
      }
    }

    // Update goal effects
    for (const effect of this.goalEffects) {
      effect.age += dt;
      for (const p of effect.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 120 * dt;
      }
    }
    this.goalEffects = this.goalEffects.filter((e) => e.age < 1.0);

    for (const effect of this.breakEffects) {
      effect.age += dt;
      for (const p of effect.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 150 * dt;
      }
    }
    this.breakEffects = this.breakEffects.filter((e) => e.age < 0.6);
  }

  private render(): void {
    this.renderer.pressedPoint = this.input.pointerDown;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.renderer.drawBackground(this.width, this.height, this.gameMode);

    if (this.state === "title") {
      // HTML タイトル画面を使用する場合は描画しません
      if (this.onReturnToTitle) return;
      this.renderer.drawTitleScreen(this.width, this.height, this.selectedObstacles, this.speedStep, this.restitutionStep, this.gameMode, this.tsumikiFreeMode);
      return;
    }

    if (this.state === "clear") {
      if (this.gameMode === "tsumiki") {
        const tsumikiScore = this.calculateTsumikiScore();
        const unusedBonus = Math.max(0,
          (this.obstacleBodies.length + this.bumperBodies.length +
          this.triangleBodies.length + this.crossBodies.length + this.seesawBodies.length + this.uShapeBodies.length + this.tsumikiShelves.length) -
          this.tsumikiMovedParts.size);
        const timeBonus = Math.floor(this.timeRemaining / 5);
        this.renderer.drawTsumikiClearScreen(this.width, this.height, this.goalsScored, tsumikiScore, unusedBonus, timeBonus, this.levelManager.hasNext());
      } else {
        this.renderer.drawClearScreen(this.width, this.height, this.goalsScored, this.levelManager.hasNext());
      }
      return;
    }

    if (this.state === "fail") {
      this.renderer.drawFailScreen(this.width, this.height);
      return;
    }

    const level = this.levelManager.current();
    if (!level) return;

    const introAge = (performance.now() - this.levelStartTime) / 1000;

    this.renderer.drawGoal(
      level.goal.x * this.width,
      level.goal.y * this.height,
      this.goalsScored,
      introAge,
    );
    this.renderer.drawStart(
      level.start.x * this.width,
      level.start.y * this.height,
      this.timerStarted ? introAge : -1,
    );
    this.renderer.drawGravityArrow(this.width, this.height);

    const now = performance.now();
    for (let i = 0; i < this.generatedObstacles.length; i++) {
      const obs = this.generatedObstacles[i]!;
      const body = this.obstacleBodies[i];
      const hitTime = body ? this.obstacleHitTimes.get(body.id) : undefined;
      const hitAge = hitTime !== undefined ? (now - hitTime) / 1000 : -1;
      const bx = body ? body.position.x : obs.x * this.width;
      const by = body ? body.position.y : obs.y * this.height;
      const angle = body ? body.angle : 0;
      this.renderer.drawDrum(
        bx,
        by,
        obs.w * this.width,
        obs.h * this.height,
        hitAge,
        angle,
      );
    }

    for (let i = 0; i < this.generatedBumpers.length; i++) {
      const bp = this.generatedBumpers[i]!;
      const body = this.bumperBodies[i];
      const hitTime = body ? this.bumperHitTimes.get(body.id) : undefined;
      const hitAge = hitTime !== undefined ? (now - hitTime) / 1000 : -1;
      const bumperR = body?.circleRadius ?? bp.r * this.width;
      this.renderer.drawBumper(
        body ? body.position.x : bp.x * this.width,
        body ? body.position.y : bp.y * this.height,
        bumperR,
        hitAge,
      );
    }

    for (let i = 0; i < this.generatedTriangles.length; i++) {
      const tri = this.generatedTriangles[i]!;
      const body = this.triangleBodies[i];
      const hitTime = body ? this.triangleHitTimes.get(body.id) : undefined;
      const hitAge2 = hitTime !== undefined ? (now - hitTime) / 1000 : -1;
      this.renderer.drawTriangle(
        body ? body.position.x : tri.x * this.width,
        body ? body.position.y : tri.y * this.height,
        tri.size * this.width,
        hitAge2,
      );
    }

    for (let i = 0; i < this.generatedCrosses.length; i++) {
      const cr = this.generatedCrosses[i]!;
      const body = this.crossBodies[i];
      const hitTime = body ? this.crossHitTimes.get(body.id) : undefined;
      const hitAge3 = hitTime !== undefined ? (now - hitTime) / 1000 : -1;
      const angle = body ? body.angle : 0;
      this.renderer.drawCross(
        cr.x * this.width,
        cr.y * this.height,
        cr.size * this.width,
        angle,
        hitAge3,
      );
    }

    for (let i = 0; i < this.generatedSeesaws.length; i++) {
      const sw = this.generatedSeesaws[i]!;
      const body = this.seesawBodies[i];
      const hitTime = body ? this.seesawHitTimes.get(body.id) : undefined;
      const hitAge4 = hitTime !== undefined ? (now - hitTime) / 1000 : -1;
      const bx = body ? body.position.x : sw.x * this.width;
      const by = body ? body.position.y : sw.y * this.height;
      const angle = body ? body.angle : 0;
      this.renderer.drawSeesaw(
        bx,
        by,
        sw.w * this.width,
        sw.h * this.height,
        angle,
        hitAge4,
      );
    }

    for (let i = 0; i < this.generatedUShapes.length; i++) {
      const us = this.generatedUShapes[i]!;
      const body = this.uShapeBodies[i];
      const hitTime = body ? this.uShapeHitTimes.get(body.id) : undefined;
      const hitAge5 = hitTime !== undefined ? (now - hitTime) / 1000 : -1;
      const angle = body ? body.angle : 0;
      this.renderer.drawUShape(
        us.x * this.width,
        us.y * this.height,
        us.size * this.width,
        angle,
        hitAge5,
      );
    }

    for (const t of level.trampolines) {
      this.renderer.drawTrampoline(t.x * this.width, t.y * this.height);
    }

    if (this.gameMode === "tsumiki") {
      // 積み木モード: 棚パーツを描画します
      for (let i = 0; i < this.tsumikiShelves.length; i++) {
        const shelf = this.tsumikiShelves[i]!;
        if (!shelf.body) continue;
        const isSelected = this.tsumikiSelectedType === "shelf" && this.tsumikiSelectedIndex === i;
        this.renderer.drawTsumikiShelf(
          shelf.body.position.x, shelf.body.position.y,
          shelf.length, shelf.body.angle, isSelected,
        );
      }

      // 選択中のパーツに回転ハンドルを描画します
      if (this.tsumikiSelectedType && this.tsumikiSelectedIndex >= 0) {
        const pos = this.tsumikiGetPartPosition(this.tsumikiSelectedType, this.tsumikiSelectedIndex);
        if (pos) {
          let angle = 0;
          if (this.tsumikiSelectedType === "shelf") {
            angle = this.tsumikiShelves[this.tsumikiSelectedIndex]?.angle ?? 0;
          } else if (this.tsumikiSelectedType === "obstacle") {
            angle = this.obstacleBodies[this.tsumikiSelectedIndex]?.angle ?? 0;
          } else if (this.tsumikiSelectedType === "triangle") {
            angle = this.triangleBodies[this.tsumikiSelectedIndex]?.angle ?? 0;
          } else if (this.tsumikiSelectedType === "cross") {
            angle = this.crossBodies[this.tsumikiSelectedIndex]?.angle ?? 0;
          } else if (this.tsumikiSelectedType === "seesaw") {
            angle = this.seesawBodies[this.tsumikiSelectedIndex]?.angle ?? 0;
          } else if (this.tsumikiSelectedType === "ushape") {
            angle = this.uShapeBodies[this.tsumikiSelectedIndex]?.angle ?? 0;
          }
          this.renderer.drawRotationHandle(pos.x, pos.y, angle);
        }
      }

      // 障害物の選択状態を描画します
      for (let i = 0; i < this.obstacleBodies.length; i++) {
        if (this.tsumikiSelectedType === "obstacle" && this.tsumikiSelectedIndex === i) {
          const body = this.obstacleBodies[i]!;
          const obs = this.generatedObstacles[i]!;
          this.renderer.drawTsumikiSelection(body.position.x, body.position.y, obs.w * this.width, obs.h * this.height, body.angle);
        }
      }
      for (let i = 0; i < this.bumperBodies.length; i++) {
        if (this.tsumikiSelectedType === "bumper" && this.tsumikiSelectedIndex === i) {
          const body = this.bumperBodies[i]!;
          const bp = this.generatedBumpers[i]!;
          const r = bp.r * this.width;
          this.renderer.drawTsumikiSelection(body.position.x, body.position.y, r * 2, r * 2);
        }
      }
      for (let i = 0; i < this.triangleBodies.length; i++) {
        if (this.tsumikiSelectedType === "triangle" && this.tsumikiSelectedIndex === i) {
          const body = this.triangleBodies[i]!;
          const tri = this.generatedTriangles[i]!;
          const size = tri.size * this.width;
          this.renderer.drawTsumikiSelection(body.position.x, body.position.y, size * 2, size * 2, body.angle);
        }
      }
      for (let i = 0; i < this.crossBodies.length; i++) {
        if (this.tsumikiSelectedType === "cross" && this.tsumikiSelectedIndex === i) {
          const cr = this.generatedCrosses[i]!;
          const armLen = cr.size * this.width * 2;
          const crossBody = this.crossBodies[i];
          this.renderer.drawTsumikiSelection(cr.x * this.width, cr.y * this.height, armLen, armLen, crossBody?.angle ?? 0);
        }
      }
      for (let i = 0; i < this.seesawBodies.length; i++) {
        if (this.tsumikiSelectedType === "seesaw" && this.tsumikiSelectedIndex === i) {
          const sw = this.generatedSeesaws[i]!;
          const body = this.seesawBodies[i];
          this.renderer.drawTsumikiSelection(
            body ? body.position.x : sw.x * this.width,
            body ? body.position.y : sw.y * this.height,
            sw.w * this.width,
            sw.h * this.height,
            body?.angle ?? 0,
          );
        }
      }
      for (let i = 0; i < this.uShapeBodies.length; i++) {
        if (this.tsumikiSelectedType === "ushape" && this.tsumikiSelectedIndex === i) {
          const us = this.generatedUShapes[i]!;
          const s = us.size * this.width * 2;
          const uBody = this.uShapeBodies[i];
          this.renderer.drawTsumikiSelection(us.x * this.width, us.y * this.height, s, s, uBody?.angle ?? 0);
        }
      }

      // フェーズ切り替えフィードバック
      if (this.tsumikiPhaseTransitionAge > 0) {
        const age = (performance.now() - this.tsumikiPhaseTransitionAge) / 1000;
        if (age < 1.0) {
          this.renderer.drawPhaseTransition(this.width, this.height, age);
        }
      }
    } else {
      // おえかきモード: 棚を描画します
      // 長押しプログレスを更新します
      if (this.longPressStartTime > 0 && this.longPressTimer) {
        this.longPressProgress = Math.min(1, (performance.now() - this.longPressStartTime) / 1000);
      }

      for (let si = 0; si < this.shelves.length; si++) {
        const shelf = this.shelves[si]!;
        const deleteProgress = si === this.longPressShelfIndex ? this.longPressProgress : 0;
        this.renderer.drawShelf(shelf, deleteProgress);
      }

      if ((this.state === "playing" || this.state === "drawing" || this.state === "rolling") && this.input.currentPath.length > 0) {
        this.renderer.drawCurrentPath(this.input.currentPath);
      }
    }

    // Draw all marbles
    if (this.marbles.length > 0) {
      for (const marble of this.marbles) {
        const colorIndex = this.marbleColors.get(marble.id) ?? 0;
        const taps = this.marbleTaps.get(marble.id) ?? 0;
        const opacity = 1 - taps * 0.2;
        this.renderer.drawMarble(
          marble.position.x,
          marble.position.y,
          MARBLE_RADIUS,
          colorIndex,
          opacity,
        );
      }
    } else if (this.state === "playing" || this.state === "drawing") {
      this.renderer.drawMarble(
        level.start.x * this.width,
        level.start.y * this.height - 20,
        MARBLE_RADIUS,
      );
    }

    // Draw white balls
    for (const wb of this.whiteBalls) {
      this.renderer.drawRainbowMarble(wb.position.x, wb.position.y, MARBLE_RADIUS);
    }

    // Draw goal effects
    for (const effect of this.goalEffects) {
      this.renderer.drawGoalEffect(effect);
    }

    // Draw break effects
    for (const effect of this.breakEffects) {
      this.renderer.drawBreakEffect(effect);
    }

    // Draw marble count and goals scored
    if (this.state === "rolling" || this.state === "playing" || this.state === "drawing") {
      this.renderer.drawMarbleInfo(this.marbles.length, this.width);
    }

    this.renderer.drawHUD(
      this.levelManager.currentLevel,
      this.width,
      this.timeRemaining,
      this.timerStarted,
      this.gameMode === "tsumiki" ? TIME_LIMIT_TSUMIKI : TIME_LIMIT,
    );

    if (this.state === "playing" || this.state === "drawing" || this.state === "rolling") {
      this.renderer.drawResetButton(this.height);
      this.renderer.drawBackButton(this.height);
    }

    // カーソルを制御点付近で grab に変更します
    this.updateCursor();
  }

  private updateCursor(): void {
    if (this.draggingShelfIndex >= 0) {
      this.canvas.style.cursor = "grabbing";
      return;
    }

    if (this.state !== "playing" && this.state !== "drawing") {
      this.canvas.style.cursor = "default";
      return;
    }

    const hover = this.input.hoverPoint;
    if (!hover) {
      this.canvas.style.cursor = "default";
      return;
    }

    for (const shelf of this.shelves) {
      const endpoints = [0, shelf.anchors.length - 1];
      for (const j of endpoints) {
        const a = shelf.anchors[j]!;
        const dx = hover.x - a.x;
        const dy = hover.y - a.y;
        if (Math.sqrt(dx * dx + dy * dy) < 24) {
          this.canvas.style.cursor = "grab";
          return;
        }
      }
    }
    this.canvas.style.cursor = "default";
  }

  private handleTap(x: number, y: number, holdDuration = 0): void {
    if (this.state === "title") {
      // HTML タイトル画面を使用する場合はスキップします
      if (this.onReturnToTitle) return;
      const cx = this.width / 2;
      const cy = this.height / 2;

      // モード選択ボタンのタップ判定
      const modeY = cy - 130;
      const modeBtnW = 120;
      const modeBtnH = 36;
      const modeGap = 10;
      const drawingX = cx - modeBtnW / 2 - modeGap / 2;
      const tsumikiX = cx + modeBtnW / 2 + modeGap / 2;

      if (Math.abs(x - drawingX) < modeBtnW / 2 && Math.abs(y - modeY) < modeBtnH / 2) {
        this.sound.tap();
        this.gameMode = "drawing";
        return;
      }
      if (Math.abs(x - tsumikiX) < modeBtnW / 2 && Math.abs(y - modeY) < modeBtnH / 2) {
        this.sound.tap();
        this.gameMode = "tsumiki";
        return;
      }

      // 障害物カードのタップ判定（2列グリッド）
      const cardW = 100;
      const cardH = 64;
      const gapX = 12;
      const gapY = 8;
      const gridTop = modeY + 32;
      const types: ObstacleType[] = ["rect", "circle", "triangle", "cross", "seesaw", "ushape"];

      for (let i = 0; i < types.length; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cardX = cx + (col === 0 ? -(cardW / 2 + gapX / 2) : (cardW / 2 + gapX / 2));
        const cardCY = gridTop + row * (cardH + gapY) + cardH / 2;
        if (
          Math.abs(x - cardX) < cardW / 2 &&
          Math.abs(y - cardCY) < cardH / 2
        ) {
          this.sound.tap();
          const type = types[i]!;
          if (this.selectedObstacles.has(type)) {
            this.selectedObstacles.delete(type);
          } else {
            this.selectedObstacles.add(type);
          }
          return;
        }
      }

      const gridRows = Math.ceil(types.length / 2);
      const gridBottom = gridTop + gridRows * (cardH + gapY);

      // あそぶボタン
      const btnY = gridBottom + 20;
      if (
        this.selectedObstacles.size > 0 &&
        Math.abs(x - cx) < 100 &&
        Math.abs(y - btnY) < 27
      ) {
        this.sound.tap();
        this.state = "playing";
        this.levelManager.loadLevel(1);
        this.randomizeStartGoalX();
        this.shelves = [];
        this.timeRemaining = this.gameMode === "tsumiki" ? TIME_LIMIT_TSUMIKI : TIME_LIMIT;
        this.timerStarted = false;
        this.levelStartTime = performance.now();
        this.generateObstacles();
        this.setupObstaclesAndWhiteBalls();
        if (this.gameMode === "tsumiki") {
          this.generateTsumikiShelves();
        }
        return;
      }

      // ステップセレクターのタップ判定
      const layout = this.getStepSelectorLayout();
      const speedHit = this.hitStepSelector(x, y, layout.cx, layout.speedY, SPEED_STEPS.length);
      if (speedHit >= 0) {
        this.sound.tap();
        this.speedStep = speedHit;
        this.saveSettings();
        return;
      }
      const bounceHit = this.hitStepSelector(x, y, layout.cx, layout.restitutionY, RESTITUTION_STEPS.length);
      if (bounceHit >= 0) {
        this.sound.tap();
        this.restitutionStep = bounceHit;
        this.saveSettings();
        return;
      }

      // 積み木モード: じゆうトグルのタップ判定
      if (this.gameMode === "tsumiki") {
        const freeY = layout.restitutionY + 32;
        const toggleTrackX = layout.cx + 4;
        if (x >= toggleTrackX && x <= toggleTrackX + 44 && Math.abs(y - freeY) < 14) {
          this.sound.tap();
          this.tsumikiFreeMode = !this.tsumikiFreeMode;
          return;
        }
      }
      return;
    }

    if (this.state === "clear" || this.state === "fail") {
      const centerX = this.width / 2;
      const centerY = this.height / 2;

      if (this.state === "clear") {
        const hasNext = this.levelManager.hasNext();
        if (hasNext) {
          // つぎへボタン
          if (Math.abs(x - centerX) < 110 && Math.abs(y - (centerY + 125)) < 30) {
            this.sound.tap();
            this.goToNextLevel();
            return;
          }
          // もういちどボタン
          if (Math.abs(x - centerX) < 110 && Math.abs(y - (centerY + 190)) < 30) {
            this.sound.tap();
            this.resetLevel();
            return;
          }
          // タイトルへボタン
          if (Math.abs(x - centerX) < 110 && Math.abs(y - (centerY + 250)) < 30) {
            this.sound.tap();
            this.goToTitle();
            return;
          }
        } else {
          // もういちどボタン
          if (Math.abs(x - centerX) < 110 && Math.abs(y - (centerY + 125)) < 30) {
            this.sound.tap();
            this.resetLevel();
            return;
          }
          // タイトルへボタン
          if (Math.abs(x - centerX) < 110 && Math.abs(y - (centerY + 190)) < 30) {
            this.sound.tap();
            this.goToTitle();
            return;
          }
        }
      } else {
        // リトライボタン
        if (Math.abs(x - centerX) < 110 && Math.abs(y - (centerY + 70)) < 30) {
          this.sound.tap();
          this.resetLevel();
          return;
        }
        // タイトルへボタン
        if (Math.abs(x - centerX) < 110 && Math.abs(y - (centerY + 135)) < 30) {
          this.sound.tap();
          this.goToTitle();
          return;
        }
      }
      return;
    }

    if (this.state === "playing" || this.state === "drawing") {
      // スタート地点タップでビー玉を転がします
      const level = this.levelManager.current();
      if (level) {
        const startX = level.start.x * this.width;
        const startY = level.start.y * this.height;
        const dx = x - startX;
        const dy = y - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) {
          this.sound.roll();
          if (this.gameMode === "tsumiki") {
            this.tsumikiPhaseTransitionAge = performance.now();
          }
          this.addMarble();
          return;
        }
      }

      // 積み木モード: パーツタップで選択/解除
      if (this.gameMode === "tsumiki") {
        const hit = this.tsumikiHitTest(x, y);
        if (hit) {
          this.sound.tap();
          if (this.tsumikiSelectedType === hit.type && this.tsumikiSelectedIndex === hit.index) {
            // 同じパーツを再タップで選択解除
            this.tsumikiSelectedIndex = -1;
            this.tsumikiSelectedType = null;
          } else {
            this.tsumikiSelectedType = hit.type;
            this.tsumikiSelectedIndex = hit.index;
          }
          return;
        } else {
          // 空白タップで選択解除
          this.tsumikiSelectedIndex = -1;
          this.tsumikiSelectedType = null;
        }
      }

      // リセットボタン（左下隅）
      if (Math.abs(x - 28) < 22 && Math.abs(y - (this.height - 28)) < 22) {
        this.sound.tap();
        this.resetLevel();
        return;
      }

      // もどるボタン（リセットの右隣）
      if (Math.abs(x - 76) < 22 && Math.abs(y - (this.height - 28)) < 22) {
        this.sound.tap();
        this.goToTitle();
        return;
      }
    }

    if (this.state === "rolling") {
      // 白いボールをタップした場合は拒否音を鳴らします
      for (const wb of this.whiteBalls) {
        const dx = x - wb.position.x;
        const dy = y - wb.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MARBLE_RADIUS + 10) {
          this.sound.deny();
          return;
        }
      }

      // Tap marble to bounce it - longer hold = stronger bounce
      // 4th tap breaks the marble
      for (const marble of this.marbles) {
        const dx = x - marble.position.x;
        const dy = y - marble.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MARBLE_RADIUS + 10) {
          const taps = (this.marbleTaps.get(marble.id) ?? 0) + 1;
          this.marbleTaps.set(marble.id, taps);

          if (taps >= 4) {
            // Break the marble with particle effect
            const mx = marble.position.x;
            const my = marble.position.y;
            const colorIndex = this.marbleColors.get(marble.id) ?? 2;
            this.spawnBreakEffect(mx, my, colorIndex);

            Matter.Composite.remove(this.engine.world, marble);
            this.marbles = this.marbles.filter((m) => m !== marble);
            this.marbleColors.delete(marble.id);
            this.marbleTaps.delete(marble.id);
            this.marbleHits.delete(marble.id);
            this.sound.erase();
            if (this.marbles.length === 0) {
              this.cleanupStaticBodies();
              this.state = this.shelves.length > 0 ? "drawing" : "playing";
            }
          } else {
            const power = Math.min(holdDuration, 1.0);
            const force = 0.024 + power * 0.075;
            Matter.Body.applyForce(marble, marble.position, {
              x: 0,
              y: -force * marble.mass,
            });
            this.sound.bounce();
          }
          return;
        }
      }

      // スタート地点タップで追加のビー玉を転がします
      const level = this.levelManager.current();
      if (level) {
        const startX = level.start.x * this.width;
        const startY = level.start.y * this.height;
        const sdx = x - startX;
        const sdy = y - startY;
        const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
        if (sdist < 40) {
          this.sound.roll();
          this.addMarble();
          return;
        }
      }

      // リセットボタン（左下隅）
      if (Math.abs(x - 28) < 22 && Math.abs(y - (this.height - 28)) < 22) {
        this.sound.tap();
        this.resetLevel();
        return;
      }

      // もどるボタン（リセットの右隣）
      if (Math.abs(x - 76) < 22 && Math.abs(y - (this.height - 28)) < 22) {
        this.sound.tap();
        this.goToTitle();
        return;
      }
    }
  }

  private handleDrawEnd(points: { x: number; y: number }[]): void {
    if (this.state !== "playing" && this.state !== "drawing" && this.state !== "rolling") return;
    // 積み木モードでは線を描画しません
    if (this.gameMode === "tsumiki") return;

    const level = this.levelManager.current();
    if (!level) return;

    if (points.length < 2) return;

    const first = points[0]!;
    const last = points[points.length - 1]!;

    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const totalLen = Math.sqrt(dx * dx + dy * dy);
    if (totalLen < 20) return;

    // 描画パスを間引いてアンカーポイントを生成します
    const anchors = this.sampleAnchors(points, 40);
    const curvePoints = this.generateSplinePoints(anchors);

    const bodies = this.createSegmentedShelfBodies(curvePoints);
    for (const body of bodies) {
      Matter.Composite.add(this.engine.world, body);
    }

    const angle = Math.atan2(dy, dx);
    this.shelves.push({ anchors, bodies, angle, length: totalLen, curvePoints });
    this.sound.draw();
    if (this.state !== "rolling") {
      this.state = "drawing";
    }
  }

  private createSegmentedShelfBodies(points: { x: number; y: number }[]): Matter.Body[] {
    const bodies: Matter.Body[] = [];

    // Simplify points to reduce segment count but keep shape
    const simplified = this.simplifyPoints(points, 5);

    for (let i = 0; i < simplified.length - 1; i++) {
      const p1 = simplified[i]!;
      const p2 = simplified[i + 1]!;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (segLen < 3) continue;

      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;
      const angle = Math.atan2(dy, dx);

      const body = Matter.Bodies.rectangle(cx, cy, segLen + 2, 10, {
        isStatic: true,
        angle,
        friction: 0.001,
        restitution: 0.2,
        label: "shelf",
        render: { visible: false },
        chamfer: { radius: 3 },
      });
      bodies.push(body);
    }

    return bodies;
  }

  private simplifyPoints(points: { x: number; y: number }[], minDist: number): { x: number; y: number }[] {
    if (points.length <= 2) return [...points];

    const result: { x: number; y: number }[] = [points[0]!];
    let lastPoint = points[0]!;

    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i]!;
      const d = Math.sqrt((p.x - lastPoint.x) ** 2 + (p.y - lastPoint.y) ** 2);
      if (d >= minDist) {
        // Further subdivide long segments
        if (d > SHELF_SEGMENT_LENGTH) {
          const numSubs = Math.ceil(d / SHELF_SEGMENT_LENGTH);
          for (let s = 1; s < numSubs; s++) {
            const t = s / numSubs;
            result.push({
              x: lastPoint.x + (p.x - lastPoint.x) * t,
              y: lastPoint.y + (p.y - lastPoint.y) * t,
            });
          }
        }
        result.push(p);
        lastPoint = p;
      }
    }

    result.push(points[points.length - 1]!);
    return result;
  }

  /** 描画パスを一定距離間隔で間引いてアンカーポイントを生成します */
  private sampleAnchors(points: { x: number; y: number }[], interval: number): { x: number; y: number }[] {
    const result: { x: number; y: number }[] = [points[0]!];
    let accumulated = 0;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]!;
      const curr = points[i]!;
      const d = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
      accumulated += d;
      if (accumulated >= interval) {
        result.push(curr);
        accumulated = 0;
      }
    }

    const last = points[points.length - 1]!;
    const lastAnchor = result[result.length - 1]!;
    if (Math.sqrt((last.x - lastAnchor.x) ** 2 + (last.y - lastAnchor.y) ** 2) > 5) {
      result.push(last);
    }

    // 最低3点を保証します
    if (result.length === 2) {
      const mid = points[Math.floor(points.length / 2)]!;
      result.splice(1, 0, mid);
    }

    return result;
  }

  /** Catmull-Rom スプラインでアンカー間を補間したポイント列を生成します */
  private generateSplinePoints(anchors: { x: number; y: number }[]): { x: number; y: number }[] {
    if (anchors.length < 2) return [...anchors];
    if (anchors.length === 2) {
      // 直線
      const result: { x: number; y: number }[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        result.push({
          x: anchors[0]!.x + (anchors[1]!.x - anchors[0]!.x) * t,
          y: anchors[0]!.y + (anchors[1]!.y - anchors[0]!.y) * t,
        });
      }
      return result;
    }

    const result: { x: number; y: number }[] = [];
    const segsPerSpan = 8;

    for (let i = 0; i < anchors.length - 1; i++) {
      const p0 = anchors[Math.max(i - 1, 0)]!;
      const p1 = anchors[i]!;
      const p2 = anchors[i + 1]!;
      const p3 = anchors[Math.min(i + 2, anchors.length - 1)]!;

      for (let s = 0; s < segsPerSpan; s++) {
        const t = s / segsPerSpan;
        const t2 = t * t;
        const t3 = t2 * t;
        result.push({
          x: 0.5 * ((-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
            + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2
            + (-p0.x + p2.x) * t
            + 2 * p1.x),
          y: 0.5 * ((-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
            + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2
            + (-p0.y + p2.y) * t
            + 2 * p1.y),
        });
      }
    }
    result.push(anchors[anchors.length - 1]!);
    return result;
  }

  /** タイトル画面のカードY座標を計算します */
  /** ステップセレクターのレイアウト情報を返します */
  private getStepSelectorLayout(): { cx: number; speedY: number; restitutionY: number } {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const modeY = cy - 130;
    const gridTop = modeY + 32;
    const cardH = 64;
    const gapY = 8;
    const obstacleTypeCount = 6; // rect, circle, triangle, cross, seesaw, ushape
    const gridRows = Math.ceil(obstacleTypeCount / 2);
    const gridBottom = gridTop + gridRows * (cardH + gapY);
    const btnY = gridBottom + 20;
    const panelTop = btnY + 34;
    const speedY = panelTop + 12;
    const restitutionY = speedY + 34;
    return { cx, speedY, restitutionY };
  }

  /** ステップセレクターのタップ判定を行い、タップされたステップ番号を返します */
  private hitStepSelector(x: number, y: number, selectorCx: number, selectorY: number, stepCount: number): number {
    if (Math.abs(y - selectorY) > 14) return -1;
    const btnW = 58;
    const btnGap = 6;
    const btnAreaW = btnW * stepCount + btnGap * (stepCount - 1);
    const btnStartX = selectorCx - btnAreaW / 2;
    for (let i = 0; i < stepCount; i++) {
      const bx = btnStartX + i * (btnW + btnGap);
      if (x >= bx && x <= bx + btnW) return i;
    }
    return -1;
  }

  private handleDragStart(x: number, y: number): boolean {

    if (this.state !== "playing" && this.state !== "drawing" && this.state !== "rolling") return false;

    // 積み木モードのD&D処理
    if (this.gameMode === "tsumiki") {
      // 回転ハンドルのドラッグ判定
      if (this.tsumikiSelectedType && this.tsumikiSelectedIndex >= 0) {
        const pos = this.tsumikiGetPartPosition(this.tsumikiSelectedType, this.tsumikiSelectedIndex);
        if (pos) {
          const handleDist = 50;
          let currentAngle = 0;
          if (this.tsumikiSelectedType === "shelf") {
            currentAngle = this.tsumikiShelves[this.tsumikiSelectedIndex]?.angle ?? 0;
          } else if (this.tsumikiSelectedType === "obstacle") {
            currentAngle = this.obstacleBodies[this.tsumikiSelectedIndex]?.angle ?? 0;
          } else if (this.tsumikiSelectedType === "triangle") {
            currentAngle = this.triangleBodies[this.tsumikiSelectedIndex]?.angle ?? 0;
          } else if (this.tsumikiSelectedType === "cross") {
            currentAngle = this.crossBodies[this.tsumikiSelectedIndex]?.angle ?? 0;
          } else if (this.tsumikiSelectedType === "seesaw") {
            currentAngle = this.seesawBodies[this.tsumikiSelectedIndex]?.angle ?? 0;
          } else if (this.tsumikiSelectedType === "ushape") {
            currentAngle = this.uShapeBodies[this.tsumikiSelectedIndex]?.angle ?? 0;
          }
          const handleX = pos.x + Math.cos(currentAngle) * handleDist;
          const handleY = pos.y + Math.sin(currentAngle) * handleDist;
          const dHandle = Math.sqrt((x - handleX) ** 2 + (y - handleY) ** 2);
          if (dHandle < 20) {
            this.tsumikiRotating = true;
            this.tsumikiRotateCenter = pos;
            return true;
          }
        }
      }

      // パーツ本体のドラッグ判定
      const hit = this.tsumikiHitTest(x, y);
      if (hit) {
        this.tsumikiSelectedType = hit.type;
        this.tsumikiSelectedIndex = hit.index;
        this.tsumikiDragging = true;
        const pos = this.tsumikiGetPartPosition(hit.type, hit.index);
        if (pos) {
          this.tsumikiDragOffset = { x: x - pos.x, y: y - pos.y };
        }
        return true;
      }
      return false;
    }

    for (let i = 0; i < this.shelves.length; i++) {
      const shelf = this.shelves[i]!;
      // 端点と中央のアンカーをドラッグ可能にします
      const midIndex = Math.floor(shelf.anchors.length / 2);
      const endpoints = [0, midIndex, shelf.anchors.length - 1];
      for (const j of endpoints) {
        const a = shelf.anchors[j]!;
        const dx = x - a.x;
        const dy = y - a.y;
        if (Math.sqrt(dx * dx + dy * dy) < 24) {
          this.draggingShelfIndex = i;
          this.draggingAnchorIndex = j;
          // 長押し削除タイマーを開始します
          this.longPressShelfIndex = i;
          this.longPressStartTime = performance.now();
          this.longPressProgress = 0;
          this.longPressTimer = setTimeout(() => {
            this.deleteLongPressedShelf();
          }, 1000);
          return true;
        }
      }
    }
    return false;
  }

  private handleDragMove(x: number, y: number): void {
    // 積み木モードのドラッグ移動
    if (this.gameMode === "tsumiki" && this.tsumikiSelectedType && this.tsumikiSelectedIndex >= 0) {
      if (this.tsumikiRotating && this.tsumikiRotateCenter) {
        // 回転操作
        const angle = Math.atan2(y - this.tsumikiRotateCenter.y, x - this.tsumikiRotateCenter.x);
        this.tsumikiRotatePart(this.tsumikiSelectedType, this.tsumikiSelectedIndex, angle);
        return;
      }
      if (this.tsumikiDragging) {
        // 移動操作
        const newX = x - this.tsumikiDragOffset.x;
        const newY = y - this.tsumikiDragOffset.y;
        this.tsumikiMovePart(this.tsumikiSelectedType, this.tsumikiSelectedIndex, newX, newY);
        return;
      }
    }

    if (this.draggingShelfIndex < 0 || this.draggingAnchorIndex < 0) return;
    const shelf = this.shelves[this.draggingShelfIndex];
    if (!shelf) return;

    // 移動が発生したら長押し削除をキャンセルします
    this.cancelLongPress();

    shelf.anchors[this.draggingAnchorIndex] = { x, y };
    this.rebuildShelf(shelf);
  }

  /** ドラッグ終了時の処理です */
  private handleDragEnd(): void {
    if (this.gameMode === "tsumiki") {
      this.tsumikiDragging = false;
      this.tsumikiRotating = false;
      this.tsumikiRotateCenter = null;
      return;
    }
    this.cancelLongPress();
    this.draggingShelfIndex = -1;
    this.draggingAnchorIndex = -1;
  }

  /** 長押しタイマーをキャンセルします */
  private cancelLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.longPressShelfIndex = -1;
    this.longPressProgress = 0;
    this.longPressStartTime = 0;
  }

  /** 長押しで棚を削除します */
  private deleteLongPressedShelf(): void {
    this.longPressTimer = null;
    const idx = this.longPressShelfIndex;
    if (idx < 0 || idx >= this.shelves.length) return;

    const shelf = this.shelves[idx]!;
    for (const body of shelf.bodies) {
      Matter.Composite.remove(this.engine.world, body);
    }
    this.shelves.splice(idx, 1);
    this.sound.erase();

    // ドラッグ状態もリセットします
    this.draggingShelfIndex = -1;
    this.draggingAnchorIndex = -1;
    this.longPressShelfIndex = -1;
    this.longPressProgress = 0;
    this.longPressStartTime = 0;

    if (this.shelves.length === 0) {
      this.state = "playing";
    }
  }

  /** アンカーの変更に合わせて棚の物理ボディを再構築します */
  private rebuildShelf(shelf: import("../entities/Shelf").Shelf): void {
    for (const body of shelf.bodies) {
      Matter.Composite.remove(this.engine.world, body);
    }

    shelf.curvePoints = this.generateSplinePoints(shelf.anchors);

    const bodies = this.createSegmentedShelfBodies(shelf.curvePoints);
    for (const body of bodies) {
      Matter.Composite.add(this.engine.world, body);
    }
    shelf.bodies = bodies;
  }

  private addMarble(): void {
    const level = this.levelManager.current();
    if (!level) return;

    if (!this.timerStarted) {
      this.timerStarted = true;
    }

    // If first marble, set up level static bodies
    if (this.marbles.length === 0) {
      this.setupLevelBodies();
    }

    this.state = "rolling";

    const startX = level.start.x * this.width;
    const startY = level.start.y * this.height - 20;

    // Offset slightly if there are already marbles at start
    const offsetX = this.marbles.length * 5;

    const colorIndex = Math.floor(Math.random() * 7);
    const trait = MARBLE_TRAITS[colorIndex]!;

    const marble = Matter.Bodies.circle(startX + offsetX, startY, MARBLE_RADIUS, {
      restitution: trait.restitution * (RESTITUTION_STEPS[this.restitutionStep]! / RESTITUTION_STEPS[2]!),
      friction: trait.friction,
      density: trait.density,
      label: "marble",
      render: { visible: false },
    });
    Matter.Composite.add(this.engine.world, marble);
    this.marbles.push(marble);
    this.marbleColors.set(marble.id, colorIndex);
    this.marbleTaps.set(marble.id, 0);
    this.marbleHits.set(marble.id, 0);
  }

  private setupObstaclesAndWhiteBalls(): void {
    const level = this.levelManager.current();
    if (!level) return;

    // Obstacles
    this.obstacleBodies = [];
    this.obstaclePivots = [];
    this.obstacleBasePositions = [];
    this.obstaclePhases = [];
    this.obstacleSpeeds = [];
    const pivotChoices: ("center" | "left" | "right")[] = ["center", "left", "right"];
    for (const obs of this.generatedObstacles) {
      const cx = obs.x * this.width;
      const cy = obs.y * this.height;
      const obsBody = Matter.Bodies.rectangle(
        cx,
        cy,
        obs.w * this.width,
        obs.h * this.height,
        {
          isStatic: true,
          friction: 0.001,
          restitution: 0.2,
          label: "obstacle",
          render: { visible: false },
          chamfer: { radius: 3 },
        },
      );
      Matter.Composite.add(this.engine.world, obsBody);
      this.obstacleBodies.push(obsBody);
      const pivot = pivotChoices[Math.floor(this.getRandom() * 3)]!;
      this.obstaclePivots.push(pivot);
      this.obstacleBasePositions.push({ x: cx, y: cy });
      this.obstaclePhases.push(this.getRandom() * Math.PI * 2);
      this.obstacleSpeeds.push(0.8 + this.getRandom() * 0.4);
    }

    // Bumpers (circular obstacles with high restitution)
    this.bumperBodies = [];
    this.bumperPhases = [];
    this.bumperBaseSizes = [];
    for (const bp of this.generatedBumpers) {
      const bpBody = Matter.Bodies.circle(
        bp.x * this.width,
        bp.y * this.height,
        bp.r * this.width,
        {
          isStatic: true,
          restitution: 1.2,
          friction: 0.001,
          label: "bumper",
          render: { visible: false },
        },
      );
      Matter.Composite.add(this.engine.world, bpBody);
      this.bumperBodies.push(bpBody);
      this.bumperPhases.push(this.getRandom() * Math.PI * 2);
      this.bumperBaseSizes.push(bp.r * this.width);
    }

    // Triangles
    this.triangleBodies = [];
    this.trianglePhases = [];
    this.triangleBasePositions = [];
    for (const tri of this.generatedTriangles) {
      const cx = tri.x * this.width;
      const cy = tri.y * this.height;
      const triBody = Matter.Bodies.polygon(
        cx,
        cy,
        3,
        tri.size * this.width,
        {
          isStatic: true,
          restitution: 0.8,
          friction: 0.001,
          label: "triangle",
          render: { visible: false },
        },
      );
      // 上を向いた三角形にするために -30度 回転します
      Matter.Body.rotate(triBody, -Math.PI / 6);
      Matter.Composite.add(this.engine.world, triBody);
      this.triangleBodies.push(triBody);
      this.trianglePhases.push(this.getRandom() * Math.PI * 2);
      this.triangleBasePositions.push({ x: cx, y: cy });
    }

    // Crosses (rotating + shape)
    this.crossBodies = [];
    for (const cr of this.generatedCrosses) {
      const cx = cr.x * this.width;
      const cy = cr.y * this.height;
      const armLen = cr.size * this.width * 2;
      const armW = cr.size * this.width * 0.4;

      const horizontal = Matter.Bodies.rectangle(cx, cy, armLen, armW, {
        render: { visible: false },
      });
      const vertical = Matter.Bodies.rectangle(cx, cy, armW, armLen, {
        render: { visible: false },
      });
      const crossBody = Matter.Body.create({
        parts: [horizontal, vertical],
        isStatic: true,
        restitution: 0.6,
        friction: 0.001,
        label: "cross",
        render: { visible: false },
      });
      Matter.Composite.add(this.engine.world, crossBody);
      this.crossBodies.push(crossBody);
    }

    // Seesaws (static board that sways periodically)
    this.seesawBodies = [];
    this.seesawPhases = [];
    this.seesawSpeeds = [];
    for (const sw of this.generatedSeesaws) {
      const cx = sw.x * this.width;
      const cy = sw.y * this.height;
      const swBody = Matter.Bodies.rectangle(
        cx,
        cy,
        sw.w * this.width,
        sw.h * this.height,
        {
          isStatic: true,
          restitution: 0.4,
          friction: 0.5,
          label: "seesaw",
          render: { visible: false },
          chamfer: { radius: 2 },
        },
      );
      Matter.Composite.add(this.engine.world, swBody);
      this.seesawBodies.push(swBody);
      this.seesawPhases.push(this.getRandom() * Math.PI * 2);
      this.seesawSpeeds.push(0.6 + this.getRandom() * 0.6);
    }

    // U-shapes (pendulum rotating, pivot at bottom center)
    this.uShapeBodies = [];
    for (const us of this.generatedUShapes) {
      const cx = us.x * this.width;
      const cy = us.y * this.height;
      const uBody = createUShapeBody(cx, cy, us.size * this.width);
      Matter.Composite.add(this.engine.world, uBody);
      this.uShapeBodies.push(uBody);
    }

    // White balls (adjacent to obstacles)
    this.setupWhiteBalls();
  }

  private setupLevelBodies(): void {
    const level = this.levelManager.current();
    if (!level) return;

    // Clean previous marbles and rolling bodies (keep obstacles and white balls)
    this.cleanupRollingBodies();

    // Goal sensor
    const goalX = level.goal.x * this.width;
    const goalY = level.goal.y * this.height;
    this.goalSensor = Matter.Bodies.circle(goalX, goalY, 30, {
      isStatic: true,
      isSensor: true,
      label: "goal",
      render: { visible: false },
    });
    Matter.Composite.add(this.engine.world, this.goalSensor);
    this.staticBodies.push(this.goalSensor);

    // Trampolines
    for (const t of level.trampolines) {
      const trampolineBody = Matter.Bodies.rectangle(
        t.x * this.width,
        t.y * this.height,
        60,
        12,
        {
          isStatic: true,
          restitution: 1.5,
          label: "trampoline",
          render: { visible: false },
        },
      );
      Matter.Composite.add(this.engine.world, trampolineBody);
      this.staticBodies.push(trampolineBody);
    }

    // Walls
    const wallThickness = 20;
    const walls = [
      Matter.Bodies.rectangle(-wallThickness / 2, this.height / 2, wallThickness, this.height * 2, { isStatic: true, label: "wall" }),
      Matter.Bodies.rectangle(this.width + wallThickness / 2, this.height / 2, wallThickness, this.height * 2, { isStatic: true, label: "wall" }),
    ];
    for (const w of walls) {
      Matter.Composite.add(this.engine.world, w);
      this.staticBodies.push(w);
    }
  }

  private checkGoal(): void {
    if (!this.goalSensor) return;

    const gx = this.goalSensor.position.x;
    const gy = this.goalSensor.position.y;

    // 白いボールのゴール判定（スコア加算なし、除去のみ）
    const whiteScored: Matter.Body[] = [];
    for (const wb of this.whiteBalls) {
      const dist = Math.sqrt(
        (wb.position.x - gx) ** 2 + (wb.position.y - gy) ** 2,
      );
      if (dist < 35) {
        whiteScored.push(wb);
      }
    }
    for (const wb of whiteScored) {
      Matter.Composite.remove(this.engine.world, wb);
      this.whiteBalls = this.whiteBalls.filter((w) => w !== wb);

      // 派手なエフェクト
      const colors = ["#FFFFFF", "#FFD93D", "#E0E0E0", "#F39C12", "#FAFAFA", "#FF6B6B", "#4ECDC4", "#45B7D1"];
      const particles = [];
      const particleCount = 24;
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = 120 + Math.random() * 80;
        particles.push({
          x: gx,
          y: gy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 60,
          color: colors[i % colors.length]!,
        });
      }
      this.goalEffects.push({ x: gx, y: gy, score: this.goalsScored, age: 0, particles });
      this.sound.clear();
    }

    if (this.marbles.length === 0) return;

    // 通常マーブルのゴール判定
    const scored: Matter.Body[] = [];
    for (const marble of this.marbles) {
      const dist = Math.sqrt(
        (marble.position.x - gx) ** 2 + (marble.position.y - gy) ** 2,
      );
      if (dist < 35) {
        scored.push(marble);
      }
    }

    for (const marble of scored) {
      const isBonus = this.whiteballHitBy.has(marble.id);
      if (isBonus) {
        this.goalsScored += 3;
      } else {
        this.goalsScored++;
      }

      const colors = isBonus
        ? ["#FFFFFF", "#FFD93D", "#E0E0E0", "#F39C12", "#FAFAFA"]
        : ["#FFD93D", "#E74C3C", "#2980B9", "#F39C12", "#2ECC71"];
      const particles = [];
      const particleCount = isBonus ? 18 : 12;
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = (isBonus ? 100 : 80) + Math.random() * 60;
        particles.push({
          x: gx,
          y: gy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 40,
          color: colors[i % colors.length]!,
        });
      }
      this.goalEffects.push({ x: gx, y: gy, score: this.goalsScored, age: 0, particles });
      this.sound.goal(this.goalsScored);

      Matter.Composite.remove(this.engine.world, marble);
      this.marbles = this.marbles.filter((m) => m !== marble);
      this.marbleColors.delete(marble.id);
      this.marbleTaps.delete(marble.id);
      this.marbleHits.delete(marble.id);
      this.whiteballHitBy.delete(marble.id);
    }
  }

  private checkOutOfBounds(): void {
    // Remove marbles that fall out of bounds
    const toRemove: Matter.Body[] = [];
    for (const marble of this.marbles) {
      if (
        marble.position.y > this.height + 100 ||
        marble.position.y < -200
      ) {
        toRemove.push(marble);
      }
    }

    for (const marble of toRemove) {
      Matter.Composite.remove(this.engine.world, marble);
      this.marbles = this.marbles.filter((m) => m !== marble);
      this.marbleColors.delete(marble.id);
      this.marbleTaps.delete(marble.id);
      this.marbleHits.delete(marble.id);
      this.whiteballHitBy.delete(marble.id);
      this.marblesFallen++;
      this.sound.fall();
    }

    // Remove white balls that fall out of bounds
    const whiteToRemove: Matter.Body[] = [];
    for (const wb of this.whiteBalls) {
      if (wb.position.y > this.height + 100 || wb.position.y < -200) {
        whiteToRemove.push(wb);
      }
    }
    for (const wb of whiteToRemove) {
      Matter.Composite.remove(this.engine.world, wb);
      this.whiteBalls = this.whiteBalls.filter((w) => w !== wb);
    }

    // If all marbles are gone, return to drawing
    if (this.marbles.length === 0 && this.state === "rolling") {
      this.cleanupStaticBodies();
      this.state = this.shelves.length > 0 ? "drawing" : "playing";
    }
  }

  private goToTitle(): void {
    this.cleanupPhysics();
    if (this.onReturnToTitle) {
      this.onReturnToTitle();
      return;
    }
    this.state = "title";
    this.selectedObstacles.clear();
  }

  private goToNextLevel(): void {
    this.levelManager.nextLevel();
    this.resetLevel();
  }

  private resetLevel(): void {
    this.cleanupPhysics();
    this.shelves = [];
    this.marbles = [];
    this.goalSensor = null;
    this.staticBodies = [];
    this.state = "playing";
    this.timeRemaining = this.gameMode === "tsumiki" ? TIME_LIMIT_TSUMIKI : TIME_LIMIT;
    this.timerStarted = false;
    this.loadSettings();
    this.levelStartTime = performance.now();
    this.goalsScored = 0;
    this.marblesFallen = 0;
    this.goalEffects = [];
    this.breakEffects = [];
    this.marbleColors.clear();
    this.marbleTaps.clear();
    this.marbleHits.clear();
    this.whiteBalls = [];
    this.whiteballHitBy.clear();
    this.obstacleBodies = [];
    this.obstaclePivots = [];
    this.obstacleBasePositions = [];
    this.obstaclePhases = [];
    this.obstacleSpeeds = [];
    this.obstacleHitTimes.clear();
    this.bumperBodies = [];
    this.bumperPhases = [];
    this.bumperBaseSizes = [];
    this.bumperHitTimes.clear();
    this.generatedTriangles = [];
    this.triangleBodies = [];
    this.trianglePhases = [];
    this.triangleBasePositions = [];
    this.triangleHitTimes.clear();
    this.generatedCrosses = [];
    this.crossBodies = [];
    this.crossHitTimes.clear();
    this.crossDirections = [];
    this.generatedSeesaws = [];
    this.seesawBodies = [];
    this.seesawHitTimes.clear();
    this.seesawPhases = [];
    this.seesawSpeeds = [];
    this.generatedUShapes = [];
    this.uShapeBodies = [];
    this.uShapeHitTimes.clear();
    this.uShapeDirections = [];
    this.uShapePhases = [];
    this.tsumikiShelves = [];
    this.tsumikiSelectedIndex = -1;
    this.tsumikiSelectedType = null;
    this.tsumikiRotating = false;
    this.tsumikiDragging = false;
    this.tsumikiMovedParts.clear();
    this.tsumikiPhaseTransitionAge = 0;
    this.generateObstacles();
    this.setupObstaclesAndWhiteBalls();
    if (this.gameMode === "tsumiki") {
      this.generateTsumikiShelves();
    }
  }

  private spawnBreakEffect(x: number, y: number, colorIndex: number): void {
    const color = MARBLE_COLORS[colorIndex] ?? MARBLE_COLORS[2]!;
    const particles = [];
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.3;
      const speed = 60 + Math.random() * 80;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        size: 2 + Math.random() * 4,
        color,
      });
    }
    this.breakEffects.push({ x, y, age: 0, particles });
  }

  private parseSeed(): void {
    const params = new URLSearchParams(window.location.search);
    const seedParam = params.get("seed");
    if (seedParam !== null) {
      this.seed = parseInt(seedParam, 10);
      if (isNaN(this.seed)) {
        this.seed = null;
      }
    }
  }

  private getRandom(): number {
    if (this.seededRandom) {
      return this.seededRandom();
    }
    return Math.random();
  }

  /** スタートとゴールのX位置をランダムに設定します */
  private randomizeStartGoalX(): void {
    const level = this.levelManager.current();
    if (!level) return;
    level.start.x = 0.1 + Math.random() * 0.8;
    level.goal.x = 0.1 + Math.random() * 0.8;
  }

  private generateObstacles(): void {
    const level = this.levelManager.current();
    if (!level) return;

    // シードがある場合はレベル番号を組み合わせて乱数生成器を初期化します
    if (this.seed !== null) {
      this.seededRandom = createSeededRandom(this.seed + level.level);
    } else {
      this.seededRandom = null;
    }

    this.generatedObstacles = [];
    this.generatedBumpers = [];
    this.generatedTriangles = [];
    this.generatedSeesaws = [];
    this.generatedUShapes = [];

    const startX = level.start.x;
    const startY = level.start.y;
    const goalX = level.goal.x;
    const goalY = level.goal.y;

    const totalCount = 3 + Math.floor(this.getRandom() * 3); // 3-5 個
    const selected = [...this.selectedObstacles];
    if (selected.length === 0) return;

    // 各タイプに均等に配分します
    const perType = Math.max(1, Math.ceil(totalCount / selected.length));

    for (const type of selected) {
      for (let i = 0; i < perType; i++) {
        const minY = Math.min(startY, goalY) + 0.1;
        const maxY = Math.max(startY, goalY) - 0.1;
        const ox = 0.15 + this.getRandom() * 0.7;
        const oy = minY + this.getRandom() * (maxY - minY);

        const dStart = Math.sqrt((ox - startX) ** 2 + (oy - startY) ** 2);
        const dGoal = Math.sqrt((ox - goalX) ** 2 + (oy - goalY) ** 2);
        if (dStart < 0.15 || dGoal < 0.15) {
          i--;
          continue;
        }

        if (type === "rect") {
          const w = 0.08 + this.getRandom() * 0.15;
          const h = 0.03 + this.getRandom() * 0.04;
          this.generatedObstacles.push({ x: ox, y: oy, w, h });
        } else if (type === "circle") {
          const r = 0.045 + this.getRandom() * 0.03;
          this.generatedBumpers.push({ x: ox, y: oy, r });
        } else if (type === "triangle") {
          const size = 0.0675 + this.getRandom() * 0.045;
          this.generatedTriangles.push({ x: ox, y: oy, size });
        } else if (type === "cross") {
          const size = 0.0675 + this.getRandom() * 0.045;
          this.generatedCrosses.push({ x: ox, y: oy, size });
          this.crossDirections.push(this.getRandom() < 0.5 ? 1 : -1);
        } else if (type === "seesaw") {
          const w = 0.15 + this.getRandom() * 0.1;
          const h = 0.025 + this.getRandom() * 0.015;
          this.generatedSeesaws.push({ x: ox, y: oy, w, h });
        } else if (type === "ushape") {
          const size = 0.04 + this.getRandom() * 0.025;
          this.generatedUShapes.push({ x: ox, y: oy, size });
          this.uShapeDirections.push(this.getRandom() < 0.5 ? 1 : -1);
          this.uShapePhases.push(this.getRandom() * Math.PI * 2);
        }
      }
    }
  }

  private setupCollisionListener(): void {
    Matter.Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        if (bodyA.label === "whiteball" && bodyB.label === "marble") {
          this.whiteballHitBy.add(bodyB.id);
        } else if (bodyB.label === "whiteball" && bodyA.label === "marble") {
          this.whiteballHitBy.add(bodyA.id);
        }

        // 障害物の衝突フィードバック
        let hitObstacle: Matter.Body | null = null;
        let hitMarble: Matter.Body | null = null;
        if (bodyA.label === "obstacle" && bodyB.label === "marble") {
          hitObstacle = bodyA;
          hitMarble = bodyB;
        } else if (bodyB.label === "obstacle" && bodyA.label === "marble") {
          hitObstacle = bodyB;
          hitMarble = bodyA;
        }
        if (hitObstacle && hitMarble) {
          this.obstacleHitTimes.set(hitObstacle.id, performance.now());
          this.sound.bounce();
          this.nudgeNearbyWhiteBalls(hitObstacle);
          // damageMarble は一旦無効にします（パーティクルのソースは残します）
          if (false as boolean) this.damageMarble(hitMarble);
        }

        // バンパーの衝突フィードバック
        let hitBumper: Matter.Body | null = null;
        let bumperMarble: Matter.Body | null = null;
        if (bodyA.label === "bumper" && bodyB.label === "marble") {
          hitBumper = bodyA;
          bumperMarble = bodyB;
        } else if (bodyB.label === "bumper" && bodyA.label === "marble") {
          hitBumper = bodyB;
          bumperMarble = bodyA;
        }
        if (hitBumper && bumperMarble) {
          this.bumperHitTimes.set(hitBumper.id, performance.now());
          this.sound.bounce();
        }

        // トライアングルの衝突フィードバック
        let hitTriangle: Matter.Body | null = null;
        let triMarble: Matter.Body | null = null;
        if (bodyA.label === "triangle" && bodyB.label === "marble") {
          hitTriangle = bodyA; triMarble = bodyB;
        } else if (bodyB.label === "triangle" && bodyA.label === "marble") {
          hitTriangle = bodyB; triMarble = bodyA;
        }
        if (hitTriangle && triMarble) {
          this.triangleHitTimes.set(hitTriangle.id, performance.now());
          this.sound.bounce();
        }

        // クロスの衝突フィードバック
        let hitCross: Matter.Body | null = null;
        if (bodyA.label === "cross" && bodyB.label === "marble") {
          hitCross = bodyA;
        } else if (bodyB.label === "cross" && bodyA.label === "marble") {
          hitCross = bodyB;
        }
        if (hitCross) {
          this.crossHitTimes.set(hitCross.id, performance.now());
          this.sound.bounce();
        }

        // シーソーの衝突フィードバック
        let hitSeesaw: Matter.Body | null = null;
        if (bodyA.label === "seesaw" && bodyB.label === "marble") {
          hitSeesaw = bodyA;
        } else if (bodyB.label === "seesaw" && bodyA.label === "marble") {
          hitSeesaw = bodyB;
        }
        if (hitSeesaw) {
          this.seesawHitTimes.set(hitSeesaw.id, performance.now());
          this.sound.bounce();
        }

        // U字型の衝突フィードバック
        let hitUShape: Matter.Body | null = null;
        if (bodyA.label === "ushape" && bodyB.label === "marble") {
          hitUShape = bodyA;
        } else if (bodyB.label === "ushape" && bodyA.label === "marble") {
          hitUShape = bodyB;
        }
        if (hitUShape) {
          this.uShapeHitTimes.set(hitUShape.id, performance.now());
          this.sound.bounce();
        }
      }
    });
  }

  private setupWhiteBalls(): void {
    if (this.selectedObstacles.size === 0) return;

    // ランダムに1つの障害物タイプを選んで白いボールを配置します
    const types = [...this.selectedObstacles];
    const type = types[Math.floor(this.getRandom() * types.length)]!;

    let whiteX = 0;
    let whiteY = 0;
    let placed = false;

    if (type === "rect" && this.generatedObstacles.length > 0) {
      const idx = Math.floor(this.getRandom() * this.generatedObstacles.length);
      const obs = this.generatedObstacles[idx]!;
      whiteX = obs.x * this.width;
      whiteY = (obs.y - obs.h / 2) * this.height - MARBLE_RADIUS - 1;
      placed = true;
    } else if (type === "circle" && this.generatedBumpers.length > 0) {
      const idx = Math.floor(this.getRandom() * this.generatedBumpers.length);
      const bp = this.generatedBumpers[idx]!;
      whiteX = bp.x * this.width;
      whiteY = (bp.y * this.height) - (bp.r * this.width) - MARBLE_RADIUS - 1;
      placed = true;
    } else if (type === "triangle" && this.generatedTriangles.length > 0) {
      const idx = Math.floor(this.getRandom() * this.generatedTriangles.length);
      const tri = this.generatedTriangles[idx]!;
      whiteX = tri.x * this.width;
      whiteY = (tri.y * this.height) - (tri.size * this.width * 0.7) - MARBLE_RADIUS - 1;
      placed = true;
    } else if (type === "cross" && this.generatedCrosses.length > 0) {
      const idx = Math.floor(this.getRandom() * this.generatedCrosses.length);
      const cr = this.generatedCrosses[idx]!;
      const armLen = cr.size * this.width;
      whiteX = cr.x * this.width;
      whiteY = (cr.y * this.height) - armLen - MARBLE_RADIUS - 1;
      placed = true;
    } else if (type === "seesaw" && this.generatedSeesaws.length > 0) {
      const idx = Math.floor(this.getRandom() * this.generatedSeesaws.length);
      const sw = this.generatedSeesaws[idx]!;
      whiteX = sw.x * this.width;
      whiteY = (sw.y - sw.h / 2) * this.height - MARBLE_RADIUS - 1;
      placed = true;
    } else if (type === "ushape" && this.generatedUShapes.length > 0) {
      const idx = Math.floor(this.getRandom() * this.generatedUShapes.length);
      const us = this.generatedUShapes[idx]!;
      whiteX = us.x * this.width;
      whiteY = (us.y * this.height) - (us.size * this.width) - MARBLE_RADIUS - 1;
      placed = true;
    }

    if (!placed) return;

    const wb = Matter.Bodies.circle(whiteX, whiteY, MARBLE_RADIUS, {
      restitution: 0.5,
      friction: 0.001,
      density: 0.002,
      label: "whiteball",
      render: { visible: false },
    });
    Matter.Composite.add(this.engine.world, wb);
    this.whiteBalls.push(wb);
  }

  private damageMarble(marble: Matter.Body): void {
    const hits = (this.marbleHits.get(marble.id) ?? 0) + 1;
    this.marbleHits.set(marble.id, hits);

    // タップダメージも加算して透明度に反映します
    const taps = this.marbleTaps.get(marble.id) ?? 0;
    this.marbleTaps.set(marble.id, taps + 1);

    if (hits >= 6) {
      const mx = marble.position.x;
      const my = marble.position.y;
      const colorIndex = this.marbleColors.get(marble.id) ?? 2;
      this.spawnBreakEffect(mx, my, colorIndex);

      Matter.Composite.remove(this.engine.world, marble);
      this.marbles = this.marbles.filter((m) => m !== marble);
      this.marbleColors.delete(marble.id);
      this.marbleTaps.delete(marble.id);
      this.marbleHits.delete(marble.id);
      this.whiteballHitBy.delete(marble.id);
      this.sound.erase();

      if (this.marbles.length === 0 && this.state === "rolling") {
        this.cleanupStaticBodies();
        this.state = this.shelves.length > 0 ? "drawing" : "playing";
      }
    }
  }

  private nudgeNearbyWhiteBalls(obstacle: Matter.Body): void {
    for (const wb of this.whiteBalls) {
      const dx = wb.position.x - obstacle.position.x;
      const dy = wb.position.y - obstacle.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80) {
        const forceX = (Math.random() - 0.5) * 0.0004;
        const forceY = -0.0002;
        Matter.Body.applyForce(wb, wb.position, { x: forceX, y: forceY });
      }
    }
  }

  private cleanupRollingBodies(): void {
    // Remove marbles and rolling static bodies, keep obstacles, white balls, shelf bodies
    for (const marble of this.marbles) {
      Matter.Composite.remove(this.engine.world, marble);
    }
    this.marbles = [];
    this.marbleColors.clear();
    this.marbleTaps.clear();
    this.marbleHits.clear();
    this.whiteballHitBy.clear();

    this.cleanupStaticBodies();
  }

  private cleanupStaticBodies(): void {
    for (const body of this.staticBodies) {
      Matter.Composite.remove(this.engine.world, body);
    }
    this.staticBodies = [];
    this.goalSensor = null;
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem("b-dama-settings");
      if (saved) {
        const data = JSON.parse(saved) as { speedStep?: number; restitutionStep?: number };
        if (typeof data.speedStep === "number" && data.speedStep >= 0 && data.speedStep < SPEED_STEPS.length) {
          this.speedStep = data.speedStep;
        }
        if (typeof data.restitutionStep === "number" && data.restitutionStep >= 0 && data.restitutionStep < RESTITUTION_STEPS.length) {
          this.restitutionStep = data.restitutionStep;
        }
      }
    } catch {
      // localStorage が使えない場合はデフォルト値を使います
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem("b-dama-settings", JSON.stringify({
        speedStep: this.speedStep,
        restitutionStep: this.restitutionStep,
      }));
    } catch {
      // localStorage が使えない場合は無視します
    }
  }

  private cleanupPhysics(): void {
    Matter.Composite.clear(this.engine.world, false);
    this.marbles = [];
    this.goalSensor = null;
    this.staticBodies = [];
    this.whiteBalls = [];
    this.whiteballHitBy.clear();
    this.obstacleBodies = [];
    this.obstaclePivots = [];
    this.obstacleBasePositions = [];
    this.obstaclePhases = [];
    this.obstacleSpeeds = [];
    this.obstacleHitTimes.clear();
    this.bumperBodies = [];
    this.bumperPhases = [];
    this.bumperBaseSizes = [];
    this.bumperHitTimes.clear();
    this.triangleBodies = [];
    this.trianglePhases = [];
    this.triangleBasePositions = [];
    this.triangleHitTimes.clear();
    this.crossBodies = [];
    this.crossHitTimes.clear();
    this.seesawBodies = [];
    this.seesawHitTimes.clear();
    this.seesawPhases = [];
    this.seesawSpeeds = [];
    this.uShapeBodies = [];
    this.uShapeHitTimes.clear();
    this.uShapeDirections = [];
    this.uShapePhases = [];
    this.tsumikiShelves = [];
    this.tsumikiSelectedIndex = -1;
    this.tsumikiSelectedType = null;
    this.tsumikiMovedParts.clear();
  }

  // ========================================
  // 積み木モード
  // ========================================

  /** 積み木モード用の棚パーツをランダム生成します */
  private generateTsumikiShelves(): void {
    const level = this.levelManager.current();
    if (!level) return;

    this.tsumikiShelves = [];
    const shelfCount = 3 + Math.floor(this.getRandom() * 2); // 3-4本

    const startX = level.start.x;
    const startY = level.start.y;
    const goalX = level.goal.x;
    const goalY = level.goal.y;

    for (let i = 0; i < shelfCount; i++) {
      const minY = Math.min(startY, goalY) + 0.1;
      const maxY = Math.max(startY, goalY) - 0.1;
      let ox = 0.15 + this.getRandom() * 0.7;
      let oy = minY + this.getRandom() * (maxY - minY);

      // スタート・ゴール付近を避けます
      const dStart = Math.sqrt((ox - startX) ** 2 + (oy - startY) ** 2);
      const dGoal = Math.sqrt((ox - goalX) ** 2 + (oy - goalY) ** 2);
      if (dStart < 0.15 || dGoal < 0.15) {
        ox = 0.3 + this.getRandom() * 0.4;
        oy = 0.3 + this.getRandom() * 0.4;
      }

      const lengths = [104, 156, 208]; // 短・中・長（1.3倍）
      const length = lengths[Math.floor(this.getRandom() * lengths.length)]!;
      const angle = (this.getRandom() - 0.5) * Math.PI * 0.6; // -54° 〜 +54°

      const px = ox * this.width;
      const py = oy * this.height;

      const body = Matter.Bodies.rectangle(px, py, length, 10, {
        isStatic: true,
        angle,
        friction: 0.001,
        restitution: 0.2,
        label: "tsumiki-shelf",
        render: { visible: false },
        chamfer: { radius: 3 },
      });
      Matter.Composite.add(this.engine.world, body);

      this.tsumikiShelves.push({ x: px, y: py, length, angle, body, moved: false });
    }
  }

  /** 積み木モードのパーツヒットテストを行います */
  private tsumikiHitTest(px: number, py: number): { type: "obstacle" | "bumper" | "triangle" | "cross" | "seesaw" | "ushape" | "shelf"; index: number } | null {
    // 棚のヒットテスト
    for (let i = 0; i < this.tsumikiShelves.length; i++) {
      const shelf = this.tsumikiShelves[i]!;
      const body = shelf.body;
      if (!body) continue;
      // 回転を考慮した矩形ヒットテスト
      const dx = px - body.position.x;
      const dy = py - body.position.y;
      const cos = Math.cos(-body.angle);
      const sin = Math.sin(-body.angle);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;
      if (Math.abs(localX) < shelf.length / 2 + 10 && Math.abs(localY) < 20) {
        return { type: "shelf", index: i };
      }
    }

    // じゆうモードがオフの場合は障害物を操作できません
    if (!this.tsumikiFreeMode) return null;

    // 障害物のヒットテスト（回転考慮）
    for (let i = 0; i < this.obstacleBodies.length; i++) {
      const body = this.obstacleBodies[i]!;
      const obs = this.generatedObstacles[i]!;
      const dx = px - body.position.x;
      const dy = py - body.position.y;
      const cos = Math.cos(-body.angle);
      const sin = Math.sin(-body.angle);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;
      const hw = (obs.w * this.width) / 2 + 8;
      const hh = (obs.h * this.height) / 2 + 8;
      if (Math.abs(localX) < hw && Math.abs(localY) < hh) {
        return { type: "obstacle", index: i };
      }
    }

    // バンパーのヒットテスト
    for (let i = 0; i < this.bumperBodies.length; i++) {
      const body = this.bumperBodies[i]!;
      const bp = this.generatedBumpers[i]!;
      const dx = px - body.position.x;
      const dy = py - body.position.y;
      const r = bp.r * this.width + 6;
      if (dx * dx + dy * dy < r * r) {
        return { type: "bumper", index: i };
      }
    }

    // トライアングルのヒットテスト（外接円 + マージン）
    for (let i = 0; i < this.triangleBodies.length; i++) {
      const body = this.triangleBodies[i]!;
      const tri = this.generatedTriangles[i]!;
      const dx = px - body.position.x;
      const dy = py - body.position.y;
      const r = tri.size * this.width + 6;
      if (dx * dx + dy * dy < r * r) {
        return { type: "triangle", index: i };
      }
    }

    // クロスのヒットテスト（回転を考慮した十字形）
    for (let i = 0; i < this.crossBodies.length; i++) {
      const cr = this.generatedCrosses[i]!;
      const body = this.crossBodies[i];
      const cx = cr.x * this.width;
      const cy = cr.y * this.height;
      const dx = px - cx;
      const dy = py - cy;
      const angle = body ? body.angle : 0;
      const cos = Math.cos(-angle);
      const sin = Math.sin(-angle);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;
      const armLen = cr.size * this.width;
      const armW = cr.size * this.width * 0.4;
      const margin = 8;
      // 水平アームまたは垂直アームの内側にあるか判定します
      const inHorizontal = Math.abs(localX) < armLen + margin && Math.abs(localY) < armW / 2 + margin;
      const inVertical = Math.abs(localX) < armW / 2 + margin && Math.abs(localY) < armLen + margin;
      if (inHorizontal || inVertical) {
        return { type: "cross", index: i };
      }
    }

    // シーソーのヒットテスト（回転考慮）
    for (let i = 0; i < this.seesawBodies.length; i++) {
      const body = this.seesawBodies[i]!;
      const sw = this.generatedSeesaws[i]!;
      const dx = px - body.position.x;
      const dy = py - body.position.y;
      const cos = Math.cos(-body.angle);
      const sin = Math.sin(-body.angle);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;
      const hw = (sw.w * this.width) / 2 + 8;
      const hh = (sw.h * this.height) / 2 + 8;
      if (Math.abs(localX) < hw && Math.abs(localY) < hh) {
        return { type: "seesaw", index: i };
      }
    }

    // U字型のヒットテスト（外接円 + マージン）
    for (let i = 0; i < this.uShapeBodies.length; i++) {
      const us = this.generatedUShapes[i]!;
      const ux = us.x * this.width;
      const uy = us.y * this.height;
      const dx = px - ux;
      const dy = py - uy;
      const r = us.size * this.width * 1.2 + 6;
      if (dx * dx + dy * dy < r * r) {
        return { type: "ushape", index: i };
      }
    }

    return null;
  }

  /** 積み木モードのパーツの位置を取得します */
  private tsumikiGetPartPosition(type: string, index: number): { x: number; y: number } | null {
    if (type === "shelf") {
      const shelf = this.tsumikiShelves[index];
      return shelf?.body ? { x: shelf.body.position.x, y: shelf.body.position.y } : null;
    }
    if (type === "obstacle") {
      const body = this.obstacleBodies[index];
      return body ? { x: body.position.x, y: body.position.y } : null;
    }
    if (type === "bumper") {
      const body = this.bumperBodies[index];
      return body ? { x: body.position.x, y: body.position.y } : null;
    }
    if (type === "triangle") {
      const body = this.triangleBodies[index];
      return body ? { x: body.position.x, y: body.position.y } : null;
    }
    if (type === "cross") {
      const cr = this.generatedCrosses[index];
      return cr ? { x: cr.x * this.width, y: cr.y * this.height } : null;
    }
    if (type === "seesaw") {
      const body = this.seesawBodies[index];
      return body ? { x: body.position.x, y: body.position.y } : null;
    }
    if (type === "ushape") {
      const us = this.generatedUShapes[index];
      return us ? { x: us.x * this.width, y: us.y * this.height } : null;
    }
    return null;
  }

  /** 積み木モードのパーツを移動します */
  private tsumikiMovePart(type: string, index: number, x: number, y: number): void {
    const level = this.levelManager.current();
    if (!level) return;

    // 画面外への移動を防止します
    const margin = 20;
    const clampedX = Math.max(margin, Math.min(this.width - margin, x));
    const clampedY = Math.max(margin, Math.min(this.height - margin, y));

    // スタート・ゴール位置の保護
    const startX = level.start.x * this.width;
    const startY = level.start.y * this.height;
    const goalX = level.goal.x * this.width;
    const goalY = level.goal.y * this.height;
    const protectR = 45;

    const dStart = Math.sqrt((clampedX - startX) ** 2 + (clampedY - startY) ** 2);
    const dGoal = Math.sqrt((clampedX - goalX) ** 2 + (clampedY - goalY) ** 2);
    if (dStart < protectR || dGoal < protectR) return;

    this.tsumikiMovedParts.add(`${type}:${index}`);

    if (type === "shelf") {
      const shelf = this.tsumikiShelves[index];
      if (shelf?.body) {
        Matter.Body.setPosition(shelf.body, { x: clampedX, y: clampedY });
        shelf.x = clampedX;
        shelf.y = clampedY;
        shelf.moved = true;
      }
    } else if (type === "obstacle") {
      const body = this.obstacleBodies[index];
      if (body) {
        Matter.Body.setPosition(body, { x: clampedX, y: clampedY });
        this.obstacleBasePositions[index] = { x: clampedX, y: clampedY };
      }
    } else if (type === "bumper") {
      const body = this.bumperBodies[index];
      if (body) {
        Matter.Body.setPosition(body, { x: clampedX, y: clampedY });
      }
    } else if (type === "triangle") {
      const body = this.triangleBodies[index];
      if (body) {
        Matter.Body.setPosition(body, { x: clampedX, y: clampedY });
        this.triangleBasePositions[index] = { x: clampedX, y: clampedY };
      }
    } else if (type === "cross") {
      const body = this.crossBodies[index];
      if (body) {
        Matter.Body.setPosition(body, { x: clampedX, y: clampedY });
        const cr = this.generatedCrosses[index];
        if (cr) {
          cr.x = clampedX / this.width;
          cr.y = clampedY / this.height;
        }
      }
    } else if (type === "seesaw") {
      const body = this.seesawBodies[index];
      if (body) {
        Matter.Body.setPosition(body, { x: clampedX, y: clampedY });
        const sw = this.generatedSeesaws[index];
        if (sw) {
          sw.x = clampedX / this.width;
          sw.y = clampedY / this.height;
        }
      }
    } else if (type === "ushape") {
      const body = this.uShapeBodies[index];
      if (body) {
        Matter.Body.setPosition(body, { x: clampedX, y: clampedY });
        const us = this.generatedUShapes[index];
        if (us) {
          us.x = clampedX / this.width;
          us.y = clampedY / this.height;
        }
      }
    }
  }

  /** 積み木モードのパーツを回転します */
  private tsumikiRotatePart(type: string, index: number, angle: number): void {
    if (type === "shelf") {
      const shelf = this.tsumikiShelves[index];
      if (shelf?.body) {
        Matter.Body.setAngle(shelf.body, angle);
        shelf.angle = angle;
        shelf.moved = true;
      }
    } else if (type === "obstacle") {
      const body = this.obstacleBodies[index];
      if (body) {
        Matter.Body.setAngle(body, angle);
      }
    } else if (type === "triangle") {
      const body = this.triangleBodies[index];
      if (body) {
        Matter.Body.setAngle(body, angle);
      }
    } else if (type === "cross") {
      const body = this.crossBodies[index];
      if (body) {
        Matter.Body.setAngle(body, angle);
      }
    } else if (type === "seesaw") {
      const body = this.seesawBodies[index];
      if (body) {
        Matter.Body.setAngle(body, angle);
      }
    } else if (type === "ushape") {
      const body = this.uShapeBodies[index];
      if (body) {
        Matter.Body.setAngle(body, angle);
      }
    }
    this.tsumikiMovedParts.add(`${type}:${index}`);
  }

  /** 積み木モードのスコア計算 */
  private calculateTsumikiScore(): number {
    let score = this.goalsScored;

    // 未移動パーツボーナス
    const totalParts = this.obstacleBodies.length + this.bumperBodies.length +
      this.triangleBodies.length + this.crossBodies.length + this.seesawBodies.length + this.uShapeBodies.length + this.tsumikiShelves.length;
    const movedCount = this.tsumikiMovedParts.size;
    const unusedBonus = Math.max(0, totalParts - movedCount);
    score += unusedBonus;

    // 時間ボーナス（残り時間に応じて）
    const timeBonus = Math.floor(this.timeRemaining / 5);
    score += timeBonus;

    return score;
  }
}
