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

export async function fetchHealth(): Promise<HealthReport> {
  const response = await apiClient.get<HealthReport>("/api/health");
  return response.data;
}
