import { expect, test } from "@playwright/test";

const DESTINATION =
  "GCULMCU5PTOAXK3GN4IB65CH7227AKYYRDKFQTHVFK554EKA46BK77HM";

async function createLink(
  request: import("@playwright/test").APIRequestContext,
  overrides: Record<string, unknown> = {}
) {
  const response = await request.post("/api/links", {
    data: {
      destination: DESTINATION,
      asset: { type: "native" },
      amount: "2.5",
      title: "E2E coffee",
      ...overrides,
    },
  });
  expect(response.status()).toBe(201);
  const payload = await response.json();
  return payload.data.link as { slug: string; memo: string; amount: string };
}

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Paylink/i);
});

test("create link via API then pay page renders pending", async ({
  page,
  request,
}) => {
  const link = await createLink(request);
  await page.goto(`/pay/${link.slug}`);
  await expect(page.getByText("Payment request")).toBeVisible();
  await expect(page.getByText("2.5").first()).toBeVisible();
  await expect(page.getByText(link.memo).first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Pay with Freighter/i })
  ).toBeVisible();
});

test("invalid link data is rejected", async ({ request }) => {
  const response = await request.post("/api/links", {
    data: {
      destination: "NOT_AN_ADDRESS",
      asset: { type: "native" },
      amount: "2.5",
      title: "Bad",
    },
  });
  expect(response.status()).toBe(422);
  const payload = await response.json();
  expect(payload.ok).toBe(false);
});

test("unknown slugs render not-found", async ({ page }) => {
  await page.goto("/pay/NOEXISTE00");
  await expect(page.getByText("404")).toBeVisible();
  await page.goto("/receipt/NOEXISTE00");
  await expect(page.getByText("404")).toBeVisible();
});

test("verify rejects malformed hashes", async ({ page, request }) => {
  const link = await createLink(request);
  const response = await request.post(`/api/links/${link.slug}/verify`, {
    data: { transactionHash: "abcd" },
  });
  expect(response.status()).toBe(422);
  await page.goto(`/receipt/${link.slug}`);
  await expect(page.getByText("No verified payment yet")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Pay this link/i })
  ).toBeVisible();
});

test("create form works by keyboard", async ({ page }) => {
  await page.goto("/create");
  await page.getByLabel("What is it for").pressSequentially("Keyboard coffee");
  await page
    .getByLabel("Amount", { exact: true })
    .pressSequentially("0.75");
  const destination = page.getByLabel("Receiving address");
  await destination.pressSequentially(DESTINATION);
  await destination.press("Enter");
  await expect(page.getByText("Link ready")).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code/i })).toBeVisible();
});

test("create form submits and shows link plus QR", async ({ page }) => {
  await page.goto("/create");
  await page.getByLabel("What is it for").fill("E2E form test");
  await page.getByLabel("Amount", { exact: true }).fill("1.25");
  await page.getByLabel("Receiving address").fill(DESTINATION);
  await page.getByRole("button", { name: /Create payment link/i }).click();
  await expect(page.getByText("Link ready")).toBeVisible();
  const urlInput = page.getByLabel("Share this link");
  await expect(urlInput).toHaveValue(/\/pay\//);
  await expect(page.getByRole("img", { name: /QR code/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Copy link/i })).toBeVisible();
});
