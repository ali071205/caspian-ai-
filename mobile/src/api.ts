export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

export type Task = { id: number; title: string; owner_id: number; deadline: string | null; status: string };
export type Member = { id: number; name: string; role: string; email: string | null };
export type TeamStatus = { total: number; pending_ack: number; blocked: number; done: number };

export async function getTasks(ownerId?: number): Promise<Task[]> {
  const query = ownerId ? `?owner_id=${ownerId}` : "";
  const response = await fetch(`${API_URL}/tasks${query}`);
  if (!response.ok) throw new Error("Could not load tasks");
  return response.json();
}

export async function setTaskStatus(id: number, status: string): Promise<void> {
  const response = await fetch(`${API_URL}/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
  if (!response.ok) throw new Error("Could not update task");
}

async function json<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

export const getMembers = () => json<Member[]>("/members");
export const getTeamStatus = () => json<TeamStatus>("/team/status");

export async function sendChat(message: string, senderName: string): Promise<{ reply: string }> {
  const response = await fetch(`${API_URL}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, sender_name: senderName, channel: "app" }) });
  if (!response.ok) throw new Error("TeamOps could not process the message");
  return response.json();
}
