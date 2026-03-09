type Point = { x: number; y: number };

export class Input {
  private canvas: HTMLCanvasElement;
  private drawing = false;
  private dragging = false;
  private path: Point[] = [];
  private tapCallback: ((x: number, y: number, holdDuration: number) => void) | null = null;
  private drawEndCallback: ((points: Point[]) => void) | null = null;
  private dragStartCallback: ((x: number, y: number) => boolean) | null = null;
  private dragMoveCallback: ((x: number, y: number) => void) | null = null;
  private dragEndCallback: (() => void) | null = null;
  private tapThreshold = 10;
  private startPoint: Point | null = null;
  private downTime = 0;

  currentPath: Point[] = [];
  pointerDown: Point | null = null;
  hoverPoint: Point | null = null;

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

  onDragStart(callback: (x: number, y: number) => boolean): void {
    this.dragStartCallback = callback;
  }

  onDragMove(callback: (x: number, y: number) => void): void {
    this.dragMoveCallback = callback;
  }

  onDragEnd(callback: () => void): void {
    this.dragEndCallback = callback;
  }

  private setupListeners(): void {
    this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    this.canvas.addEventListener("pointermove", (e) => this.onPointerMove(e));
    this.canvas.addEventListener("pointerup", (e) => this.onPointerUp(e));
    this.canvas.addEventListener("pointercancel", () => this.onPointerCancel());
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.hoverPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    });
    this.canvas.addEventListener("mouseleave", () => {
      this.hoverPoint = null;
    });
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
    this.startPoint = p;
    this.pointerDown = p;
    this.downTime = performance.now();

    // 制御点のドラッグ判定を先に行います
    if (this.dragStartCallback && this.dragStartCallback(p.x, p.y)) {
      this.dragging = true;
      this.drawing = false;
      return;
    }

    this.drawing = true;
    this.dragging = false;
    this.path = [p];
    this.currentPath = [p];
  }

  private onPointerMove(e: PointerEvent): void {
    e.preventDefault();
    const p = this.getPoint(e);

    if (this.dragging) {
      this.pointerDown = p;
      this.dragMoveCallback?.(p.x, p.y);
      return;
    }

    if (!this.drawing) return;
    this.path.push(p);
    this.currentPath = [...this.path];
  }

  private onPointerUp(e: PointerEvent): void {
    e.preventDefault();
    this.pointerDown = null;

    if (this.dragging) {
      this.dragging = false;
      this.dragEndCallback?.();
      return;
    }

    if (!this.drawing) return;
    this.drawing = false;

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
    if (this.dragging) {
      this.dragging = false;
      this.dragEndCallback?.();
    }
    this.drawing = false;
    this.pointerDown = null;
    this.path = [];
    this.currentPath = [];
  }
}
