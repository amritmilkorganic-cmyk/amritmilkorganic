import { createClient } from "@sanity/client";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = createClient({
  projectId:
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "fqzgs92z",

  dataset:
    process.env.NEXT_PUBLIC_SANITY_DATASET || "production",

  apiVersion:
    process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01",

  useCdn: false,

  token:
    process.env.SANITY_WRITE_TOKEN ||
    process.env.SANITY_API_TOKEN,
});

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
}

const customer = {
  name: "Pankaj",
  phone: "8130693767",
  email: "info.amritmilk@gmail.com",

  // Change this temporary password before running
  password: "Amrit@123",
};

async function createAccount() {
  try {
    const cleanPhone = customer.phone
      .replace(/\D/g, "")
      .slice(-10);

    const existing = await client.fetch(
      `*[
        _type == "customerAccount" &&
        phone == $phone
      ][0]`,
      {
        phone: cleanPhone,
      }
    );

    if (existing) {
      console.log("Customer account already exists.");
      console.log("Account ID:", existing._id);
      return;
    }

    const now = new Date().toISOString();

    const result = await client.create({
      _type: "customerAccount",

      name: customer.name,

      phone: cleanPhone,

      email: customer.email,

      passwordHash: hashPassword(customer.password),

      isActive: true,

      createdAt: now,

      updatedAt: now,
    });

    console.log("Customer account created successfully.");
    console.log("Account ID:", result._id);
  } catch (error) {
    console.error("Failed to create customer account:");
    console.error(error);
  }
}

createAccount();