export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

export type TaskStatus = "PENDING_ACK" | "TODO" | "IN_PROGRESS" | "DELAYED" | "BLOCKED" | "DONE" | "CANCELLED";

export type Task = {
  id: number;
  title: string;
  description: string | null;
  owner_id: number;
  deadline: string | null;
  status: TaskStatus;
  at_risk: boolean;
  created_at?: string;
};

export type Member = {
  id: number;
  name: string;
  role: string;
  email: string | null;
  contact?: string | null;
  skills_description?: string | null;
  approved?: boolean;
  active?: boolean;
};

export type TeamStatus = {
  total: number;
  pending_ack: number;
  blocked: number;
  delayed: number;
  at_risk: number;
  done: number;
};

export type Connection = {
  channel: "email" | "slack";
  status: string;
  setup_url: string | null;
  detail: string | null;
};

export type UserAuth = {
  user_id: number;
  name: string;
  email?: string;
  role: string;
  team_code: string;
  team_name: string;
  token: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      ...init,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || `Request failed (${response.status})`);
    }
    return data as T;
  } catch (err: any) {
    console.warn(`[API] Error on ${path}:`, err?.message);
    throw err;
  }
}

// ==================== AUTHENTICATION ====================

export const adminSignup = (payload: {
  email: string;
  password: string;
  name?: string;
  workspace_name?: string;
}) => request<UserAuth>("/auth/admin/signup", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const adminLogin = (payload: {
  email: string;
  password: string;
}) => request<UserAuth>("/auth/admin/login", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const adminSendOtp = (email: string) =>
  request<{ status: string; message: string; demo_code?: string }>("/auth/admin/send-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const adminVerifyOtp = (payload: {
  email: string;
  token_code: string;
}) => request<UserAuth>("/auth/admin/verify-otp", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const memberLogin = (name: string, teamCode?: string) =>
  request<UserAuth>("/auth/member/login", {
    method: "POST",
    body: JSON.stringify({ name, team_code: teamCode }),
  });

// ==================== TEAM CODE & ONBOARDING ====================

export const verifyTeamCode = (teamCode: string) =>
  request<{ valid: boolean; team_name: string; team_id: number }>("/team/verify-code", {
    method: "POST",
    body: JSON.stringify({ team_code: teamCode }),
  });

export const submitJoinRequest = (payload: {
  team_code: string;
  name: string;
  email: string;
  role: string;
  contact?: string;
  skills_description?: string;
}) =>
  request<{ status: string; message: string; member: any }>("/team/join-request", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getTeamCode = () =>
  request<{ team_name: string; team_code: string }>("/team/code");

export const getPendingMembers = () =>
  request<Member[]>("/members/pending");

export const approveMember = (userId: number) =>
  request<Member>(`/members/${userId}/approve`, {
    method: "PATCH",
    body: JSON.stringify({ approved: true }),
  });

export const rejectMember = (userId: number) =>
  request<void>(`/members/${userId}/reject`, {
    method: "DELETE",
  });

// ==================== TASKS & MEMBERS ====================

export const getTasks = (ownerId?: number) =>
  request<Task[]>(`/tasks${ownerId ? `?owner_id=${ownerId}` : ""}`);

export const createTask = (payload: {
  title: string;
  owner_id: number;
  description?: string;
  deadline?: string;
}) => request<Task>("/tasks", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const setTaskStatus = (id: number, status: TaskStatus) =>
  request<Task>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const getMembers = () =>
  request<Member[]>("/members");

export const getTeamStatus = () =>
  request<TeamStatus>("/team/status");

export const getConnections = () =>
  request<Connection[]>("/connections");

export const sendChat = (message: string, senderName: string = "Admin") =>
  request<{ reply: string; intent?: any }>("/chat", {
    method: "POST",
    body: JSON.stringify({ message, sender_name: senderName, channel: "app" }),
  });

export const getNotifications = (userId?: number) =>
  request<any[]>(`/notifications${userId ? `?user_id=${userId}` : ""}`);

export const getEvents = () =>
  request<any[]>("/events");
