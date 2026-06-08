/** Derived-data cache key patterns (Phase 2). */

export const cacheKeys = {
  product: (id: string) => `product:${id}`,
  productsAll: () => "products:all",
  category: (slug: string) => `category:${slug}`,
  categoriesAll: () => "categories:all",
} as const;
