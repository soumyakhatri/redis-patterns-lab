import { prisma } from "../lib/prisma.js";
import { cacheAside, type CacheAsideOutcome } from "../redis/cacheAside.js";
import { cacheKeys } from "../redis/keys.js";
import { AppError } from "../middleware/errorHandler.js";

const productInclude = {
  category: {
    select: { id: true, name: true, slug: true },
  },
  inventory: {
    select: { quantity: true },
  },
} as const;

export type ProductDto = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  inventory: { quantity: number } | null;
  createdAt: string;
  updatedAt: string;
};

function serializeProduct(product: {
  id: string;
  name: string;
  description: string | null;
  price: { toString(): string };
  categoryId: string;
  category: { id: string; name: string; slug: string };
  inventory: { quantity: number } | null;
  createdAt: Date;
  updatedAt: Date;
}): ProductDto {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price.toString(),
    categoryId: product.categoryId,
    category: product.category,
    inventory: product.inventory,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

async function loadProductById(id: string): Promise<ProductDto> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });

  if (!product) {
    throw new AppError(404, "Product not found");
  }

  return serializeProduct(product);
}

async function loadAllProducts(): Promise<ProductDto[]> {
  const products = await prisma.product.findMany({
    include: productInclude,
    orderBy: { name: "asc" },
  });

  return products.map(serializeProduct);
}

export async function getProductById(
  id: string,
): Promise<CacheAsideOutcome<ProductDto>> {
  return cacheAside(cacheKeys.product(id), () => loadProductById(id));
}

export async function listProducts(): Promise<CacheAsideOutcome<ProductDto[]>> {
  return cacheAside(cacheKeys.productsAll(), loadAllProducts);
}
