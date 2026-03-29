import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/bdama/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        debug: resolve(__dirname, "debug.html"),
        "debug-rect": resolve(__dirname, "debug/rect.html"),
        "debug-circle": resolve(__dirname, "debug/circle.html"),
        "debug-triangle": resolve(__dirname, "debug/triangle.html"),
        "debug-cross": resolve(__dirname, "debug/cross.html"),
        "debug-seesaw": resolve(__dirname, "debug/seesaw.html"),
        "debug-ushape": resolve(__dirname, "debug/ushape.html"),
      },
    },
  },
});
