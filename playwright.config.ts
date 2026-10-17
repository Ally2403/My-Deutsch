import { defineConfig, devices } from "@playwright/test";

// E2E_BASE_URL permite probar una build de producción (`next start`) en otro puerto.
const external = process.env.E2E_BASE_URL;
const baseURL = external ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: { baseURL, trace: "retain-on-failure" },
  webServer: external
    ? undefined
    : {
        command: "pnpm dev",
        url: `${baseURL}/lector/demo`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: "movil-360",
      use: { ...devices["Pixel 5"], viewport: { width: 360, height: 740 } },
    },
    {
      name: "tablet-768",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
    },
    {
      name: "pc-1280",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "iphone-webkit",
      use: { ...devices["iPhone 13"] },
    },
  ],
});
