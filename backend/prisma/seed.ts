import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required for seeding");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const electronics = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {},
    create: {
      name: "Electronics",
      slug: "electronics",
    },
  });

  const apparel = await prisma.category.upsert({
    where: { slug: "apparel" },
    update: {},
    create: {
      name: "Apparel",
      slug: "apparel",
    },
  });

  const products = [
    {
      name: "Wireless Headphones",
      description: "Noise-cancelling over-ear headphones",
      price: 149.99,
      categoryId: electronics.id,
      quantity: 50,
    },
    {
      name: "Mechanical Keyboard",
      description: "Hot-swappable switches, RGB backlight",
      price: 89.99,
      categoryId: electronics.id,
      quantity: 30,
    },
    {
      name: "Cotton T-Shirt",
      description: "Unisex crew neck, 100% cotton",
      price: 24.99,
      categoryId: apparel.id,
      quantity: 100,
    },
  ];

  for (const product of products) {
    const { quantity, ...data } = product;
    const existing = await prisma.product.findFirst({
      where: { name: data.name },
    });

    if (!existing) {
      await prisma.product.create({
        data: {
          ...data,
          inventory: {
            create: { quantity },
          },
        },
      });
    }
  }

  console.log("Seed complete: categories and sample products created.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
