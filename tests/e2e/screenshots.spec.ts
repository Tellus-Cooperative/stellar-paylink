import { expect, test } from "@playwright/test";

const DESTINATION =
  "GCULMCU5PTOAXK3GN4IB65CH7227AKYYRDKFQTHVFK554EKA46BK77HM";

test("capture release screenshots", async ({ page, request }, testInfo) => {
  const suffix = testInfo.project.name === "mobile" ? "-mobile" : "";
  const shot = (name: string) => `screenshots/${name}${suffix}.png`;

  const response = await request.post("/api/links", {
    data: {
      destination: DESTINATION,
      asset: { type: "native" },
      amount: "2.5",
      title: "E2E coffee",
    },
  });
  expect(response.status()).toBe(201);
  const { slug } = (await response.json()).data.link as { slug: string };

  await page.goto("/create");
  await page.screenshot({ path: shot("create") });
  await page.goto(`/pay/${slug}`);
  await expect(page.getByText("Payment request")).toBeVisible();
  await page.screenshot({ path: shot("pay") });
  await page.goto(`/receipt/${slug}`);
  await expect(page.getByText("No verified payment yet")).toBeVisible();
  await page.screenshot({ path: shot("receipt-pending") });
});
