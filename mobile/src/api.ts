export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

export type Task = { id: number; title: string; description: string | null; owner_id: number; deadline: string | null; status: string; at_risk: boolean };
export type Member = { id: number; name: string; role: string; email: string | null };
export type TeamStatus = { total: number; pending_ack: number; blocked: number; delayed: number; at_risk: number; done: number };
export type Connection = { channel: "email" | "slack"; status: string; setup_url: string | null; detail: string | null };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, ...init });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

export const getTasks = (ownerId?: number) => request<Task[]>(`/tasks${ownerId ? `?owner_id=${ownerId}` : ""}`);
export const getMembers = () => request<Member[]>("/members");
export const getTeamStatus = () => request<TeamStatus>("/team/status");
export const getConnections = () => request<Connection[]>("/connections");
export const startConnection = (channel: Connection["channel"]) => request<Connection>(`/connections/${channel}/start`, { method: "POST" });
export const createMember = (payload: Omit<Member, "id">) => request<Member>("/members", { method: "POST", body: JSON.stringify(payload) });
export const setTaskStatus = (id: number, status: string) => request<void>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
export const sendChat = (message: string, senderName: string) => request<{ reply: string; intent: { intent: string } }>("/chat", { method: "POST", body: JSON.stringify({ message, sender_name: senderName, channel: "app" }) });
