import { prisma } from "../lib/prisma.js";
import { cacheAside, type CacheAsideOutcome } from "../redis/cacheAside.js";
import { cacheKeys } from "../redis/keys.js";
import { AppError } from "../middleware/errorHandler.js";

export type CategoryDto = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type CategoryWithProductsDto = CategoryDto & {
  products: Array<{
    id: string;
    name: string;
    price: string;
    inventory: { quantity: number } | null;
  }>;
};

function serializeCategory(category: {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

async function loadAllCategories(): Promise<CategoryDto[]> {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return categories.map(serializeCategory);
}

async function loadCategoryBySlug(slug: string): Promise<CategoryWithProductsDto> {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        select: {
          id: true,
          name: true,
          price: true,
          inventory: { select: { quantity: true } },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!category) {
    throw new AppError(404, "Category not found");
  }

  const { products, ...rest } = category;

  return {
    ...serializeCategory(rest),
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price.toString(),
      inventory: product.inventory,
    })),
  };
}

export async function listCategories(): Promise<CacheAsideOutcome<CategoryDto[]>> {
  return cacheAside(cacheKeys.categoriesAll(), loadAllCategories);
}

export async function getCategoryBySlug(
  slug: string,
): Promise<CacheAsideOutcome<CategoryWithProductsDto>> {
  return cacheAside(cacheKeys.category(slug), () => loadCategoryBySlug(slug));
}
