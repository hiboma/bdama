import { describe, it, expect, beforeEach, vi } from "vitest";
import { Renderer } from "../Renderer";
import { LevelManager } from "../LevelManager";
import { createMockContext } from "./canvas-mock";

type MockCtx = CanvasRenderingContext2D & {
  _fillTextCalls: { text: string; x: number; y: number }[];
};

const W = 390;
const H = 844;

describe("全ステージ共通 UI テスト", () => {
  const levelManager = new LevelManager();
  const totalLevels = levelManager.totalLevels();

  for (let lvl = 1; lvl <= totalLevels; lvl++) {
    describe(`Lv.${lvl}`, () => {
      let renderer: Renderer;
      let ctx: MockCtx;

      beforeEach(() => {
        ctx = createMockContext() as MockCtx;
        renderer = new Renderer(ctx);
        levelManager.loadLevel(lvl);
      });

      it("drawBackground が画面サイズで描画されます", () => {
        const spy = vi.spyOn(ctx, "fillRect");
        renderer.drawBackground(W, H);
        expect(spy).toHaveBeenCalled();
      });

      it("drawStart がレベルのスタート座標で呼ばれます", () => {
        const level = levelManager.current()!;
        renderer.drawStart(level.start.x * W, level.start.y * H);
        const startLabel = ctx._fillTextCalls.find(
          (c) => c.text === "スタート",
        );
        expect(startLabel).toBeDefined();
      });

      it("drawGoal がレベルのゴール座標で呼ばれます", () => {
        const level = levelManager.current()!;
        const arcSpy = vi.spyOn(ctx, "arc");
        renderer.drawGoal(level.goal.x * W, level.goal.y * H);
        expect(arcSpy).toHaveBeenCalled();
      });

      it("drawGravityArrow が呼ばれます", () => {
        const moveSpy = vi.spyOn(ctx, "moveTo");
        renderer.drawGravityArrow(W, H);
        expect(moveSpy).toHaveBeenCalled();
      });

      it("drawLevelBackground にレベル番号が表示されます", () => {
        renderer.drawLevelBackground(lvl, W, H);
        const levelText = ctx._fillTextCalls.find(
          (c) => c.text === `Lv.${lvl}`,
        );
        expect(levelText).toBeDefined();
      });

      it("drawHUD にタイマー値が表示されます", () => {
        renderer.drawHUD(lvl, W, 25, true);
        const timerText = ctx._fillTextCalls.find((c) =>
          c.text.includes("25"),
        );
        expect(timerText).toBeDefined();
      });

      it("drawResetButton が描画されます", () => {
        const roundRectSpy = vi.spyOn(ctx, "roundRect");
        renderer.drawResetButton(H);
        expect(roundRectSpy).toHaveBeenCalled();
      });

      it("drawMarbleInfo がビー玉数0で呼ばれてもエラーになりません", () => {
        expect(() => {
          renderer.drawMarbleInfo(0, W);
        }).not.toThrow();
      });

      it("drawMarbleInfo にビー玉数が表示されます", () => {
        renderer.drawMarbleInfo(3, W);
        const countText = ctx._fillTextCalls.find((c) => c.text === "x3");
        expect(countText).toBeDefined();
      });

      it("drawGoal にスコアバッジが表示されます", () => {
        renderer.drawGoal(200, 400, 5);
        const scoreText = ctx._fillTextCalls.find((c) => c.text === "5");
        expect(scoreText).toBeDefined();
      });
    });
  }
});

describe("画面状態別テスト", () => {
  let renderer: Renderer;
  let ctx: MockCtx;

  beforeEach(() => {
    ctx = createMockContext() as MockCtx;
    renderer = new Renderer(ctx);
  });

  it("drawTitleScreen がタイトルを表示します", () => {
    renderer.drawTitleScreen(W, H);
    const hasTitle = ctx._fillTextCalls.some(
      (c) => c.text.includes("ビー玉") || c.text.includes("ころころ"),
    );
    expect(hasTitle).toBe(true);
  });

  it("drawClearScreen がスコアを表示します", () => {
    renderer.drawClearScreen(W, H, 5);
    const hasScore = ctx._fillTextCalls.some((c) => c.text.includes("5"));
    expect(hasScore).toBe(true);
  });

  it("drawFailScreen がリトライを表示します", () => {
    renderer.drawFailScreen(W, H);
    const hasRetry = ctx._fillTextCalls.some((c) =>
      c.text.includes("リトライ"),
    );
    expect(hasRetry).toBe(true);
  });

  it("drawTitleScreen が速度と弾性の値を表示します", () => {
    renderer.drawTitleScreen(W, H, 0.4, 0.5);
    const hasSpeed = ctx._fillTextCalls.some((c) => c.text.includes("0.4"));
    const hasRestitution = ctx._fillTextCalls.some((c) =>
      c.text.includes("0.5"),
    );
    expect(hasSpeed).toBe(true);
    expect(hasRestitution).toBe(true);
  });
});
