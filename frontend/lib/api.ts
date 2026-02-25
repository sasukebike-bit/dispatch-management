import { Driver, Order, DispatchResult } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Drivers ---
export const getDrivers = () => request<Driver[]>("/drivers/");
export const createDriver = (name: string) =>
  request<Driver>("/drivers/", { method: "POST", body: JSON.stringify({ name }) });
export const deleteDriver = (id: number) =>
  request<void>(`/drivers/${id}`, { method: "DELETE" });

// --- Orders ---
export const getOrders = (date: string) =>
  request<Order[]>(`/orders/?delivery_date=${date}`);
export const createOrder = (data: Omit<Order, "id">) =>
  request<Order>("/orders/", { method: "POST", body: JSON.stringify(data) });
export const updateOrder = (id: number, data: Omit<Order, "id">) =>
  request<Order>(`/orders/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteOrder = (id: number) =>
  request<void>(`/orders/${id}`, { method: "DELETE" });

export const importOrdersCSV = async (date: string, file: File): Promise<Order[]> => {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/orders/import-csv?delivery_date=${date}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// --- Dispatch ---
export const runDispatch = (date: string) =>
  request<DispatchResult>(`/dispatch/run?delivery_date=${date}`, { method: "POST" });
export const getDispatchResult = (date: string) =>
  request<DispatchResult>(`/dispatch/result?delivery_date=${date}`);
export const manualAssign = (date: string, assignments: { order_id: number; driver_id: number }[]) =>
  request<DispatchResult>(`/dispatch/manual?delivery_date=${date}`, {
    method: "PUT",
    body: JSON.stringify({ assignments }),
  });
export const getPdfUrl = (date: string) => `${BASE_URL}/dispatch/pdf?delivery_date=${date}`;
