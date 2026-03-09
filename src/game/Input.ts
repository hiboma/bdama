type Point = { x: number; y: number };

export class Input {
  private canvas: HTMLCanvasElement;
  private drawing = false;
  private path: Point[] = [];
  private tapCallback: ((x: number, y: number, holdDuration: number) => void) | null = null;
  private drawEndCallback: ((points: Point[]) => void) | null = null;
  private tapThreshold = 10;
  private startPoint: Point | null = null;
  private downTime = 0;

  currentPath: Point[] = [];
  pointerDown: Point | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupListeners();
  }

  onTap(callback: (x: number, y: number, holdDuration: number) => void): void {
    this.tapCallback = callback;
  }

  onDrawEnd(callback: (points: Point[]) => void): void {
    this.drawEndCallback = callback;
  }

  private setupListeners(): void {
    this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    this.canvas.addEventListener("pointermove", (e) => this.onPointerMove(e));
    this.canvas.addEventListener("pointerup", (e) => this.onPointerUp(e));
    this.canvas.addEventListener("pointercancel", () => this.onPointerCancel());
  }

  private getPoint(e: PointerEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.getPoint(e);
    this.drawing = true;
    this.startPoint = p;
    this.pointerDown = p;
    this.downTime = performance.now();
    this.path = [p];
    this.currentPath = [p];
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.drawing) return;
    e.preventDefault();
    const p = this.getPoint(e);
    this.path.push(p);
    this.currentPath = [...this.path];
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.drawing) return;
    e.preventDefault();
    this.drawing = false;
    this.pointerDown = null;

    const endPoint = this.getPoint(e);

    // Determine if it was a tap or a draw
    if (this.startPoint) {
      const dx = endPoint.x - this.startPoint.x;
      const dy = endPoint.y - this.startPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.tapThreshold) {
        const holdDuration = (performance.now() - this.downTime) / 1000;
        this.tapCallback?.(endPoint.x, endPoint.y, holdDuration);
        this.currentPath = [];
        return;
      }
    }

    this.drawEndCallback?.([...this.path]);
    this.currentPath = [];
  }

  private onPointerCancel(): void {
    this.drawing = false;
    this.pointerDown = null;
    this.path = [];
    this.currentPath = [];
  }
}
