import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const URL_APP = `http://localhost:${PORT}`;

// Satu database sementara per run; nilai diwariskan ke proses worker lewat env.
process.env.E2E_DATABASE ??= `lockerpintar_e2e_${Date.now()}`;

function urlDatabaseE2e() {
  const u = new URL(process.env.DATABASE_URL_TEST ?? "postgresql://localhost:54329/lockerpintar_test");
  u.pathname = `/${process.env.E2E_DATABASE}`;
  return u.toString();
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: URL_APP,
    trace: "retain-on-failure",
    locale: "id-ID",
  },
  projects: [
    {
      name: "chrome",
      // Memakai Google Chrome yang sudah terpasang (tidak perlu unduh browser Playwright).
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1366, height: 900 } },
    },
  ],
  webServer: {
    command: `npx next build && npx next start -H localhost -p ${PORT}`,
    // Cek kesiapan tanpa menyentuh database (database dibuat di globalSetup).
    url: `${URL_APP}/manifest.webmanifest`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      DATABASE_URL: urlDatabaseE2e(),
      BETTER_AUTH_URL: URL_APP,
    },
  },
});
