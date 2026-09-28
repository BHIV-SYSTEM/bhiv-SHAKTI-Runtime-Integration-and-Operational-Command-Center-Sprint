import axios from "axios";

const MITRA_BASE_URL = import.meta.env.VITE_MITRA_URL || "/api/mitra";

export interface MitraHealthResponse {
  status: "healthy" | "operational" | "degraded" | "offline";
  timestamp: string;
  version?: string;
  service?: string;
  response_time_ms?: number;
  details?: string;
}

export async function fetchMitraHealth(): Promise<MitraHealthResponse> {
  const startTime = Date.now();
  try {
    const { data } = await axios.get<MitraHealthResponse>(`${MITRA_BASE_URL}/health`, {
      timeout: 5000,
    });
    const latency = Date.now() - startTime;
    return {
      status: data.status === "healthy" ? "operational" : (data.status || "operational"),
      timestamp: data.timestamp || new Date().toISOString(),
      version: data.version || "4.0.0",
      service: "mitra_companion",
      response_time_ms: latency,
      details: `v${data.version || '4.0.0'} | Pipeline Active`,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      status: "offline",
      timestamp: new Date().toISOString(),
      version: "4.0.0",
      service: "mitra_companion",
      response_time_ms: latency,
      details: "Connection failed",
    };
  }
}
