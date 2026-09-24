import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createOrder: vi.fn(),
  updateOrderPaymentStatus: vi.fn(),
  notify: vi.fn(),
  sanityFetch: vi.fn(),
  sanityCreate: vi.fn(),
  decrypt: vi.fn(),
  parseResponse: vi.fn(),
  couponUpdate: vi.fn(),
}));

vi.mock("@/lib/sanity-orders", () => ({ createOrder: mocks.createOrder, updateOrderPaymentStatus: mocks.updateOrderPaymentStatus, getOrders: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ sendOrderNotifications: mocks.notify }));
vi.mock("@/lib/sanity", () => ({ writeClient: { fetch: mocks.sanityFetch, create: mocks.sanityCreate } }));
vi.mock("@/lib/ccavenue", () => ({
  decrypt: mocks.decrypt,
  parseResponse: mocks.parseResponse,
  encrypt: vi.fn(() => "encrypted-request"),
  buildRequestData: vi.fn(() => "order_id=test"),
  CCAVENUE_URLS: { test: "https://test.ccavenue.example", production: "https://ccavenue.example" },
}));
vi.mock("@prisma/client", () => ({ PrismaClient: class { coupon = { update: mocks.couponUpdate }; } }));

import { POST as createOrderRoute } from "@/app/api/orders/route";
import { POST as ccavenueCallback } from "@/app/api/ccavenue/handle/route";
import { POST as subscriptionCallback } from "@/app/api/subscriptions/handle/route";
import { POST as initiateCcavenue } from "@/app/api/ccavenue/initiate/route";
import { POST as createSubscription } from "@/app/api/subscriptions/create/route";

const origin = "https://shop.example";
function jsonRequest(path: string, body: unknown) {
  return new NextRequest(`${origin}${path}`, { method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(body) });
}
function paymentRequest(path: string) {
  const form = new FormData(); form.set("encResp", "encrypted");
  return new NextRequest(`${origin}${path}`, { method: "POST", body: form });
}
const order = {
  customerName: "Guest", email: "guest@example.test", phone: "9999999999",
  address: "1 Farm Road", city: "Lucknow", state: "UP", pincode: "226001",
  items: [{ title: "Milk", price: "100", quantity: 1 }], subtotal: 100,
  deliveryFee: 0, discount: 0, total: 100,
};

describe("actual checkout routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SANITY_WRITE_TOKEN = "test-write-token";
    process.env.CCAVENUE_WORKING_KEY = "test-working-key";
    process.env.CCAVENUE_MERCHANT_ID = "merchant";
    process.env.CCAVENUE_ACCESS_CODE = "access";
    process.env.CCAVENUE_TEST_MODE = "true";
    mocks.sanityFetch.mockResolvedValue([]);
    mocks.createOrder.mockResolvedValue({ orderNumber: "AMR-1", id: "order-1" });
    mocks.updateOrderPaymentStatus.mockResolvedValue({ ...order, orderNumber: "AMR-1" });
    mocks.decrypt.mockReturnValue("decrypted");
  });

  it("preserves unauthenticated guest COD checkout and notifications", async () => {
    const response = await createOrderRoute(jsonRequest("/api/orders", { ...order, paymentMethod: "cod" }));
    expect(response.status).toBe(200);
    expect(mocks.createOrder).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: "cod", total: 100 }));
    expect(mocks.notify).toHaveBeenCalledOnce();
  });

  it("preserves guest CCAvenue order creation without premature notifications", async () => {
    const response = await createOrderRoute(jsonRequest("/api/orders", { ...order, paymentMethod: "ccavenue" }));
    expect(response.status).toBe(200);
    expect(mocks.createOrder).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: "ccavenue" }));
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("preserves CCAvenue initiation fields", async () => {
    const response = await initiateCcavenue(jsonRequest("/api/ccavenue/initiate", {
      orderId: "AMR-1", amount: 100, customerName: "Guest", customerEmail: "guest@example.test",
      customerPhone: "9999999999", billingAddress: "1 Farm Road", billingCity: "Lucknow",
      billingState: "UP", billingZip: "226001",
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, encryptedData: "encrypted-request", accessCode: "access" });
  });

  it("preserves subscription-payment initiation fields", async () => {
    const response = await createSubscription(jsonRequest("/api/subscriptions/create", {
      productId: "milk", productName: "Milk Plan", variant: "1L", quantity: 1, price: 500,
      planType: "monthly_30day", customerName: "Guest", customerEmail: "guest@example.test",
      customerPhone: "9999999999", billingAddress: "1 Farm Road", billingCity: "Lucknow",
      billingState: "UP", billingZip: "226001", startDate: "2026-09-25",
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, encryptedData: "encrypted-request", accessCode: "access" });
  });

  it("processes a successful CCAvenue callback and redirects to checkout success", async () => {
    mocks.parseResponse.mockReturnValue({ order_id: "AMR-1", tracking_id: "tracking", order_status: "Success" });
    const response = await ccavenueCallback(paymentRequest("/api/ccavenue/handle"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/checkout/success");
    expect(mocks.updateOrderPaymentStatus).toHaveBeenCalledWith("AMR-1", "success", "tracking");
    expect(mocks.notify).toHaveBeenCalledOnce();
  });

  it("uses a stable generic CCAvenue failure code", async () => {
    mocks.parseResponse.mockReturnValue({ order_id: "AMR-1", order_status: "Failure", status_message: "raw provider database detail" });
    const response = await ccavenueCallback(paymentRequest("/api/ccavenue/handle"));
    expect(response.headers.get("location")).toContain("message=payment_failed");
    expect(response.headers.get("location")).not.toContain("provider");
  });

  it("preserves successful subscription payment creation and linked order", async () => {
    mocks.parseResponse.mockReturnValue({
      order_id: "SUB-1", tracking_id: "tracking", order_status: "Success", amount: "500",
      billing_name: "Guest", billing_email: "guest@example.test", billing_tel: "9999999999",
      billing_address: "1 Farm Road", billing_city: "Lucknow", billing_state: "UP", billing_zip: "226001",
      merchant_param2: "milk", merchant_param3: "monthly_30day", merchant_param4: "Milk Plan",
    });
    const response = await subscriptionCallback(paymentRequest("/api/subscriptions/handle"));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/subscription/success");
    expect(mocks.sanityCreate).toHaveBeenCalledWith(expect.objectContaining({ _type: "subscription", subscriptionId: "SUB-1" }));
    expect(mocks.createOrder).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: "ccavenue", total: 500 }));
    expect(mocks.updateOrderPaymentStatus).toHaveBeenCalled();
  });

  it("uses a stable generic subscription failure code", async () => {
    mocks.parseResponse.mockReturnValue({ order_status: "Failure", failure_message: "raw provider database detail" });
    const response = await subscriptionCallback(paymentRequest("/api/subscriptions/handle"));
    expect(response.headers.get("location")).toContain("reason=payment_failed");
    expect(response.headers.get("location")).not.toContain("provider");
  });
});
