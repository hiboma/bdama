import { vi } from "vitest";

/**
 * Canvas 2D コンテキストのモックを生成します。
 * 描画メソッドの呼び出しをスパイで追跡できます。
 */
export function createMockContext(): CanvasRenderingContext2D {
  const fillTextCalls: { text: string; x: number; y: number }[] = [];

  const ctx = {
    // 状態
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    globalAlpha: 1,
    font: "",
    textAlign: "start",
    textBaseline: "alphabetic",
    shadowColor: "rgba(0,0,0,0)",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,

    // パス
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    roundRect: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    rect: vi.fn(),

    // 描画
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(
      (text: string, x: number, y: number) => {
        fillTextCalls.push({ text, x, y });
      },
    ),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),

    // 変換
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),

    // グラデーション
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),

    // その他
    clip: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createPattern: vi.fn(),

    // テスト用ヘルパー
    _fillTextCalls: fillTextCalls,
  } as unknown as CanvasRenderingContext2D & {
    _fillTextCalls: { text: string; x: number; y: number }[];
  };

  return ctx;
}
