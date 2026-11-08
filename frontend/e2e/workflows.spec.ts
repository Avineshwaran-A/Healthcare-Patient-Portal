import { expect, type Page, test } from "@playwright/test";

// Synthetic demo password from backend/app/seed.py
const PASSWORD = "Demo@12345";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("unauthenticated users are sent to sign-in", async ({ page }) => {
  await page.goto("/patient");
  await expect(page).toHaveURL(/\/login/);
});

test("patient books an appointment", async ({ page }) => {
  await login(page, "meera@example.com");
  await expect(page).toHaveURL(/\/patient$/);
  await page.goto("/patient/doctors");
  await page.getByRole("link", { name: "View availability" }).first().click();
  const slot = page.getByRole("button", { name: /\d{1,2}:\d{2} (am|pm)/i }).first();
  await slot.click();
  await page.getByRole("button", { name: "Book appointment" }).click();
  await expect(page.getByText("Your appointment is booked")).toBeVisible();
});

test("roles cannot open other workspaces", async ({ page }) => {
  await login(page, "rahul@example.com");
  await expect(page).toHaveURL(/\/patient$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/patient$/);
});

test("admin sees hospital overview", async ({ page }) => {
  await login(page, "admin@example.com");
  await expect(page.getByRole("heading", { name: "Hospital overview" })).toBeVisible();
});
