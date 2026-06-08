import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface HealthReport {
  status: "ok" | "degraded";
  timestamp: string;
  postgres: "connected" | "unavailable";
  redis: "connected" | "unavailable";
}

export type CacheStatus = "hit" | "miss" | "bypass";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  inventory: { quantity: number } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryWithProducts extends Category {
  products: Array<{
    id: string;
    name: string;
    price: string;
    inventory: { quantity: number } | null;
  }>;
}

interface ApiResponse<T> {
  data: T;
  cache: CacheStatus;
}

async function getWithCache<T>(path: string): Promise<ApiResponse<T>> {
  const response = await apiClient.get<T>(path);
  const cacheHeader = response.headers["x-cache"];
  const cache: CacheStatus =
    cacheHeader === "hit" || cacheHeader === "miss" || cacheHeader === "bypass"
      ? cacheHeader
      : "bypass";

  return { data: response.data, cache };
}

export async function fetchHealth(): Promise<HealthReport> {
  const response = await apiClient.get<HealthReport>("/api/health");
  return response.data;
}

export async function fetchProducts(): Promise<ApiResponse<{ products: Product[] }>> {
  return getWithCache("/api/products");
}

export async function fetchProduct(
  id: string,
): Promise<ApiResponse<{ product: Product }>> {
  return getWithCache(`/api/products/${id}`);
}

export async function fetchCategories(): Promise<
  ApiResponse<{ categories: Category[] }>
> {
  return getWithCache("/api/categories");
}

export async function fetchCategory(
  slug: string,
): Promise<ApiResponse<{ category: CategoryWithProducts }>> {
  return getWithCache(`/api/categories/${slug}`);
}
