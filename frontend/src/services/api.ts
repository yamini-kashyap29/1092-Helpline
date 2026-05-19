import axios from "axios";

// Points to your main base engine URL configuration matching port parameters
const API_BASE_URL = "http://localhost:8000/api/v1"; 

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" }
});

export const dashboardAPI = {
  getStats: () => client.get("/calls/dashboard/stats"),
  getActiveCalls: () => client.get("/calls?status=ongoing"),
  getRecentCalls: (limit?: number) => client.get(`/calls?status=resolved`),
  endCall: (id: string) => client.post(`/calls/${id}/end`),
};
export const callAPI = {
  getCallDetails: (id: string) => client.get(`/calls/${id}`),
  endCall: (id: string) => client.post(`/calls/${id}/end`),
  updateSeverity: (id: string, level: string) => client.patch(`/calls/${id}/severity`, { severity_level: level }),
};

export const historyAPI = {
  getCallRecords: (filters?: { status?: string; language?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== "All") params.append("status", filters.status);
    if (filters?.language && filters.language !== "All") params.append("language", filters.language);
    return client.get(`/calls?${params.toString()}`);
  }
};