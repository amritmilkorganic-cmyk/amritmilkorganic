/**
* Notification System
* Sends email and WhatsApp notifications for orders
*/

interface OrderNotificationData {
orderNumber: string;
customerName: string;
email: string;
phone: string;
total: number;
paymentMethod: string;
items: { title: string; quantity: number; price: string }[];
address?: string;
city?: string;
state?: string;
pincode?: string;
}

import nodemailer from "nodemailer";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const DEFAULT_ORDER_EMAIL = "amritmilkorganic@amritmilk.in";

const transporter = nodemailer.createTransport({
host: process.env.SMTP_HOST || "smtpout.secureserver.net",
port: parseInt(process.env.SMTP_PORT || "465"),
secure: process.env.SMTP_SECURE === "true",

auth: {
user: process.env.SMTP_USER || DEFAULT_ORDER_EMAIL,
pass: process.env.SMTP_PASSWORD,
},
});

function formatPaymentStatus(method: string): string {
const m = method.toLowerCase();
if (m === "cod") return "Cash on Delivery (Pending Collection)";
if (m === "online" || m === "ccavenue") return "Paid Online (Verified)";
return method.toUpperCase();
}

export async function sendOrderEmailNotification(order: OrderNotificationData): Promise<boolean> {
const smtpUser = process.env.SMTP_USER || DEFAULT_ORDER_EMAIL;
const merchantEmail = process.env.MERCHANT_EMAIL || DEFAULT_ORDER_EMAIL;

if (!smtpUser || !process.env.SMTP_PASSWORD) {
console.warn("Merchant email skipped: SMTP_USER or SMTP_PASSWORD not configured");
return false;
}

const itemsList = order.items
.map((item) => `• ${item.title} × ${item.quantity} - ${item.price}`)
.join("\n");

const paymentStatus = formatPaymentStatus(order.paymentMethod);
const fullAddress = [order.address, order.city, order.state, order.pincode]
.filter(Boolean)
.join(", ");

try {
await transporter.sendMail({
from: `"Amrit Milk Orders" <${smtpUser}>`,
to: merchantEmail.split(",").map((e) => e.trim()),
subject: `🛒 New Order: ${order.orderNumber} - ₹${order.total}`,
text: `New Order Received!

Order Number: ${order.orderNumber}
Customer: ${order.customerName}
Phone: ${order.phone}
Email: ${order.email}
Delivery Address: ${fullAddress || "Not provided"}
Payment: ${paymentStatus}

Items:
${itemsList}

Total: ₹${order.total}`,
html: `
<div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px;">
<h2 style="color: #D4AF37;">New Order Received!</h2>
<p><strong>Order Number:</strong> ${order.orderNumber}</p>
<p><strong>Customer:</strong> ${order.customerName}</p>
<p><strong>Phone:</strong> ${order.phone}</p>
<p><strong>Email:</strong> ${order.email || "N/A"}</p>

<div style="background: #fff8e1; padding: 12px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #D4AF37;">
<p style="margin: 0;"><strong>📍 Delivery Address:</strong></p>
<p style="margin: 5px 0 0 0;">${order.address || "N/A"}</p>
<p style="margin: 5px 0 0 0;">${order.city || ""}${order.state ? ", " + order.state : ""} - ${order.pincode || ""}</p>
</div>

<p><strong>Payment:</strong> <span style="background: #e8f5e9; padding: 4px 8px; border-radius: 4px; color: #2e7d32; font-weight: bold;">${paymentStatus}</span></p>
<hr>
<h3>Items:</h3>
<pre style="background: #f9f9f9; padding: 10px; border-radius: 4px;">${itemsList}</pre>
<hr>
<p style="font-size: 18px;"><strong>Total: ₹${order.total}</strong></p>
</div>
`,
});

console.log(`SMTP Email notification sent for order ${order.orderNumber}`);
return true;
} catch (error: any) {
console.error("SMTP Email notification error:", {
message: error.message,
code: error.code,
command: error.command,
response: error.response,
});
return false;
}
}

export async function sendCustomerConfirmationEmail(
order: OrderNotificationData
): Promise<boolean> {
const smtpUser = process.env.SMTP_USER || DEFAULT_ORDER_EMAIL;

if (!smtpUser || !process.env.SMTP_PASSWORD || !order.email) {
console.warn("Customer email skipped: No SMTP config or customer email");
return false;
}

const itemsList = order.items
.map((item) => `• ${item.title} × ${item.quantity} - ${item.price}`)
.join("<br>");

const paymentStatus = formatPaymentStatus(order.paymentMethod);

try {
await transporter.sendMail({
from: `"Amrit Milk" <${smtpUser}>`,
to: order.email,
subject: `Order Confirmed: ${order.orderNumber} - Amrit Milk`,
html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #1a1a1a; padding: 30px; background: #fff;">
<h1 style="color: #D4AF37; text-align: center;">Thank you for your order!</h1>
<p>Hi ${order.customerName},</p>
<p>Your order has been received and is being prepared with pure care from our farm to your kitchen.</p>

<div style="background: #fdfaf0; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5d1b1;">
<p style="margin: 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
<p style="margin: 5px 0 0 0;"><strong>Payment Status:</strong> ${paymentStatus}</p>
</div>

<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
<h4 style="margin: 0 0 10px 0; color: #333;">📍 Delivering To:</h4>
<p style="margin: 0; color: #555;">${order.address || "Address not provided"}</p>
<p style="margin: 5px 0 0 0; color: #555;">${order.city || ""}${order.state ? ", " + order.state : ""} - ${order.pincode || ""}</p>
</div>

<h3 style="border-bottom: 2px solid #D4AF37; padding-bottom: 5px;">Order Summary:</h3>
<p style="line-height: 1.6;">${itemsList}</p>

<p style="font-size: 24px; color: #1a1a1a; text-align: right;"><strong>Total: ₹${order.total}</strong></p>

<hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
<p style="color: #666; font-size: 14px; text-align: center;">
If you have any questions, reply to this email or reach out on WhatsApp (+91 81306 93767).
</p>
<p style="color: #D4AF37; text-align: center; font-size: 18px;"><strong>Welcome to the Amrit family! 🥛</strong></p>
</div>
`,
});

console.log(`Customer SMTP confirmation email sent to ${order.email}`);
return true;
} catch (error: any) {
console.error("Customer SMTP email error details:", {
message: error.message,
code: error.code,
command: error.command,
response: error.response,
});
return false;
}
}

export async function sendWhatsAppNotification(order: OrderNotificationData): Promise<boolean> {
const whatsappNumber = process.env.MERCHANT_WHATSAPP;
const apiKey = process.env.CALLMEBOT_API_KEY;

if (!whatsappNumber || !apiKey) return false;

const fullAddress = [order.address, order.city, order.pincode].filter(Boolean).join(", ");

const message = encodeURIComponent(
`🛒 *New Order!*\n\n` +
`Order: ${order.orderNumber}\n` +
`Customer: ${order.customerName}\n` +
`Phone: ${order.phone}\n` +
`📍 Address: ${fullAddress || "N/A"}\n` +
`Total: ₹${order.total}\n` +
`Payment: ${formatPaymentStatus(order.paymentMethod)}`
);

try {
const url = `https://api.callmebot.com/whatsapp.php?phone=${whatsappNumber}&text=${message}&apikey=${apiKey}`;
const response = await fetch(url);
return response.ok;
} catch (error) {
console.error("WhatsApp error:", error);
return false;
}
}

export async function sendResendEmail(order: OrderNotificationData): Promise<boolean> {
if (!resend || !process.env.RESEND_API_KEY) return false;

const merchantEmail = process.env.MERCHANT_EMAIL || DEFAULT_ORDER_EMAIL;

const itemsList = order.items
.map((item) => `• ${item.title} × ${item.quantity} - ${item.price}`)
.join("<br>");

const paymentStatus = formatPaymentStatus(order.paymentMethod);
const fullAddress = [order.address, order.city, order.state, order.pincode]
.filter(Boolean)
.join(", ");

try {
await resend.emails.send({
from: "Amrit Milk <onboarding@resend.dev>",
to: merchantEmail.split(",").map((e) => e.trim()),
subject: `🛒 New Order: ${order.orderNumber}`,
html: `
<div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee;">
<h2 style="color: #D4AF37;">New Order Received!</h2>
<p><strong>Order:</strong> ${order.orderNumber}</p>
<p><strong>Customer:</strong> ${order.customerName}</p>
<p><strong>Phone:</strong> ${order.phone}</p>
<p><strong>📍 Deliver To:</strong> ${fullAddress || "Not provided"}</p>
<p><strong>Total:</strong> ₹${order.total}</p>
<p><strong>Payment:</strong> ${paymentStatus}</p>
<hr>
<h3>Items:</h3>
<p>${itemsList}</p>
</div>
`,
});

console.log(`Resend: Merchant notification sent for ${order.orderNumber}`);
return true;
} catch (error) {
console.error("Resend error:", error);
return false;
}
}

export async function sendAutomationWebhook(order: OrderNotificationData): Promise<boolean> {
const webhookUrl = process.env.AUTOMATION_WEBHOOK_URL;
if (!webhookUrl) return false;

try {
const response = await fetch(webhookUrl, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
source: "amrit-milk-website",
event: "new_order",
timestamp: new Date().toISOString(),
data: order,
}),
});

console.log(`[Webhook] Trigger status: ${response.ok ? "SUCCESS" : "FAILED"}`);
return response.ok;
} catch (error) {
console.error("[Webhook] Automation Trigger error:", error);
return false;
}
}

export async function sendTelegramNotification(order: OrderNotificationData): Promise<boolean> {
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
if (!botToken || !chatId) return false;

const paymentStatus = formatPaymentStatus(order.paymentMethod);
const fullAddress = [order.address, order.city, order.pincode].filter(Boolean).join(", ");

const text =
`🛒 *New Order: ${order.orderNumber}*\n\n` +
`👤 *Customer:* ${order.customerName}\n` +
`📞 *Phone:* ${order.phone}\n` +
`📍 *Address:* ${fullAddress || "N/A"}\n` +
`💰 *Total:* ₹${order.total}\n` +
`💳 *Payment:* ${paymentStatus}\n\n` +
`📦 *Items:*\n` +
order.items.map((i) => `• ${i.title} x${i.quantity}`).join("\n");

try {
const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
const res = await fetch(url, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
chat_id: chatId,
text,
parse_mode: "Markdown",
}),
});

console.log("Telegram notification sent");
return res.ok;
} catch (error) {
console.error("Telegram error:", error);
return false;
}
}

export async function sendNtfyNotification(order: OrderNotificationData): Promise<boolean> {
const topic = process.env.NTFY_TOPIC;
if (!topic) return false;

try {
const res = await fetch(`https://ntfy.sh/${topic}`, {
method: "POST",
body: `New Order: ${order.orderNumber} from ${order.customerName} (₹${order.total}) - ${formatPaymentStatus(order.paymentMethod)}`,
headers: {
Title: "🛒 Amrit Milk Order",
Priority: "5",
Tags: "shopping_cart,milk_glass",
},
});

console.log("ntfy.sh notification sent");
return res.ok;
} catch (error) {
console.error("ntfy error:", error);
return false;
}
}

export async function sendOrderNotifications(order: OrderNotificationData): Promise<void> {
console.log(`Starting notifications for order: ${order.orderNumber}`);

const attempts = [
sendOrderEmailNotification(order),
sendCustomerConfirmationEmail(order),
sendWhatsAppNotification(order),
sendResendEmail(order),
sendAutomationWebhook(order),
sendTelegramNotification(order),
sendNtfyNotification(order),
];

const results = await Promise.allSettled(attempts);

console.log(
`All notification attempts for ${order.orderNumber} completed:`,
results.map((r, i) => `${i}: ${r.status}`)
);
}
