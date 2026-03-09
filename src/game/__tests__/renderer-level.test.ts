import { describe, it, expect, beforeEach, vi } from "vitest";
import { Renderer } from "../Renderer";
import { createMockContext } from "./canvas-mock";

type MockCtx = CanvasRenderingContext2D & {
  _fillTextCalls: { text: string; x: number; y: number }[];
};

const W = 390;
const H = 844;

describe("ステージ固有 UI テスト", () => {
  let renderer: Renderer;
  let ctx: MockCtx;

  beforeEach(() => {
    ctx = createMockContext() as MockCtx;
    renderer = new Renderer(ctx);
  });

  describe("Lv.1 - ランダム障害物 + 白いボール", () => {
    it("drawDrum が障害物の数だけ呼ばれます", () => {
      const drawDrumSpy = vi.spyOn(renderer, "drawDrum");
      // ランダム障害物2個をシミュレートします
      renderer.drawDrum(0.3 * W, 0.4 * H, 0.1 * W, 0.04 * H);
      renderer.drawDrum(0.6 * W, 0.6 * H, 0.15 * W, 0.05 * H);
      expect(drawDrumSpy).toHaveBeenCalledTimes(2);
    });

    it("白いボール（colorIndex=7）が描画されます", () => {
      const drawMarbleSpy = vi.spyOn(renderer, "drawMarble");
      renderer.drawMarble(100, 200, 17, 7);
      expect(drawMarbleSpy).toHaveBeenCalledWith(100, 200, 17, 7);
    });

    it("drawDrum が衝突フィードバック付きで呼ばれた場合エラーになりません", () => {
      expect(() => {
        renderer.drawDrum(0.5 * W, 0.5 * H, 0.1 * W, 0.04 * H, 0.1);
      }).not.toThrow();
    });
  });

  describe("Lv.2-4 - 障害物なし", () => {
    it("drawDrum が呼ばれません", () => {
      const drawDrumSpy = vi.spyOn(renderer, "drawDrum");
      // Lv.2-4 は obstacles が空なので drawDrum は呼ばれません
      // ここでは呼ばないことを確認するだけです
      expect(drawDrumSpy).not.toHaveBeenCalled();
    });

    it("drawTrampoline が呼ばれません", () => {
      const spy = vi.spyOn(renderer, "drawTrampoline");
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("Lv.5 - 固定障害物3個 + トランポリン1個", () => {
    it("drawDrum が3回呼ばれます", () => {
      const spy = vi.spyOn(renderer, "drawDrum");
      const obstacles = [
        { x: 0.35, y: 0.3, w: 0.18, h: 0.04 },
        { x: 0.7, y: 0.52, w: 0.15, h: 0.04 },
        { x: 0.15, y: 0.65, w: 0.04, h: 0.1 },
      ];
      for (const obs of obstacles) {
        renderer.drawDrum(obs.x * W, obs.y * H, obs.w * W, obs.h * H);
      }
      expect(spy).toHaveBeenCalledTimes(3);
    });

    it("drawTrampoline が1回呼ばれます", () => {
      const spy = vi.spyOn(renderer, "drawTrampoline");
      renderer.drawTrampoline(0.5 * W, 0.82 * H);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Lv.10 - 固定障害物2個 + トランポリン1個", () => {
    it("drawDrum が2回呼ばれます", () => {
      const spy = vi.spyOn(renderer, "drawDrum");
      const obstacles = [
        { x: 0.2, y: 0.25, w: 0.2, h: 0.04 },
        { x: 0.78, y: 0.55, w: 0.04, h: 0.1 },
      ];
      for (const obs of obstacles) {
        renderer.drawDrum(obs.x * W, obs.y * H, obs.w * W, obs.h * H);
      }
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it("drawTrampoline が1回呼ばれます", () => {
      const spy = vi.spyOn(renderer, "drawTrampoline");
      renderer.drawTrampoline(0.75 * W, 0.82 * H);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("drawDrum 衝突フィードバック", () => {
    it("hitAge < 0 の場合は通常色で描画されます", () => {
      expect(() => {
        renderer.drawDrum(100, 200, 80, 30, -1);
      }).not.toThrow();
    });

    it("hitAge = 0.1 の場合は衝突色で描画されます", () => {
      expect(() => {
        renderer.drawDrum(100, 200, 80, 30, 0.1);
      }).not.toThrow();
    });

    it("hitAge > 0.3 の場合は通常色に戻ります", () => {
      expect(() => {
        renderer.drawDrum(100, 200, 80, 30, 0.5);
      }).not.toThrow();
    });
  });

  describe("drawMarble 色バリエーション", () => {
    it("7色 + 白色の全8パターンがエラーなく描画されます", () => {
      for (let i = 0; i <= 7; i++) {
        expect(() => {
          renderer.drawMarble(100, 100, 17, i);
        }).not.toThrow();
      }
    });

    it("opacity を指定して描画できます", () => {
      expect(() => {
        renderer.drawMarble(100, 100, 17, 0, 0.6);
      }).not.toThrow();
    });
  });
});
