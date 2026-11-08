import { defineConfig, devices } from "@playwright/test";

// Expects the API (seeded with `python -m app.seed --reset`) on :8000 and the
// web app on :3000.
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: process.env.E2E_BASE_URL || "http://localhost:3000" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
