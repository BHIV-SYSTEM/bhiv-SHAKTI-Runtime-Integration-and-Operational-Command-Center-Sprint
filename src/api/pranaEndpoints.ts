import axios from "axios";
import type {
  PranaHealthResponse,
  PranaSystemHealthResponse,
  PranaPropagationLogResponse,
} from "@/types/prana";

let PRANA_BASE_URL =
  import.meta.env.VITE_PRANA_SERVICE_URL ?? import.meta.env.VITE_PRANA_URL ?? "";

// Normalize base URL if it's a Vercel domain missing the /api prefix
if (PRANA_BASE_URL.includes("vercel.app") && !PRANA_BASE_URL.includes("/api/")) {
  PRANA_BASE_URL = `${PRANA_BASE_URL.replace(/\/$/, "")}/api/prana`;
}

export const pranaClient = axios.create({
  baseURL: PRANA_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

export async function fetchPranaHealth(): Promise<PranaHealthResponse> {
  const { data } = await pranaClient.get<PranaHealthResponse>("/health");
  return data;
}

export async function fetchPranaSystemHealth(): Promise<PranaSystemHealthResponse> {
  const { data } = await pranaClient.get<PranaSystemHealthResponse>("/prana/system/health");
  return data;
}

export async function fetchPranaPropagationLog(limit = 50): Promise<PranaPropagationLogResponse> {
  const { data } = await pranaClient.get<any>("/prana/propagation-log", { params: { limit } });

  if (Array.isArray(data)) {
    return { logs: data, total: data.length, count: data.length };
  }

  const rawLogs = Array.isArray(data?.logs)
    ? data.logs
    : Array.isArray(data?.events)
    ? data.events
    : [];

  return {
    ...data,
    logs: rawLogs,
    total: data?.total ?? rawLogs.length,
    count: data?.count ?? rawLogs.length,
  };
}

