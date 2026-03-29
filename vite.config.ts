import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/bdama/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        debug: resolve(__dirname, "debug.html"),
      },
    },
  },
});
