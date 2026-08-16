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

export type VoiceUploadResult = {
  transcript: string;
  summary: string;
  teamops_result: { reply?: string; [key: string]: unknown };
  sender: string;
  audio: {
    filename: string;
    content_type: string;
    size_bytes: number;
  };
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

export const getPendingMembers = (teamCode: string) =>
  request<Member[]>(`/members/pending?team_code=${encodeURIComponent(teamCode)}`);

export const approveMember = (userId: number, teamCode: string) =>
  request<Member>(`/members/${userId}/approve`, {
    method: "PATCH",
    body: JSON.stringify({ approved: true, team_code: teamCode }),
  });

export const rejectMember = (userId: number, teamCode: string) =>
  request<void>(`/members/${userId}/reject?team_code=${encodeURIComponent(teamCode)}`, {
    method: "DELETE",
  });

// ==================== TASKS & MEMBERS ====================

export const getTasks = (ownerId?: number, teamCode?: string) => {
  const params = new URLSearchParams();
  if (ownerId) params.set("owner_id", String(ownerId));
  if (teamCode) params.set("team_code", teamCode);
  const query = params.toString();
  return request<Task[]>(`/tasks${query ? `?${query}` : ""}`);
};

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

export const respondToTask = (
  id: number,
  action: "accept" | "reject" | "complete" | "done",
  reason?: string,
  userId?: number
) =>
  request<Task>(`/tasks/${id}/respond`, {
    method: "PATCH",
    body: JSON.stringify({ action, reason, user_id: userId }),
  });

export const getMembers = (teamCode?: string) =>
  request<Member[]>(`/members${teamCode ? `?team_code=${encodeURIComponent(teamCode)}` : ""}`);

export const adminAddMember = (payload: {
  team_code: string;
  name: string;
  role: string;
  email?: string;
}) => request<Member>("/team/members", {
  method: "POST",
  body: JSON.stringify(payload),
});

export const adminRemoveMember = (userId: number, teamCode: string) =>
  request<void>(`/team/members/${userId}?team_code=${encodeURIComponent(teamCode)}`, {
    method: "DELETE",
  });

export const getTeamStatus = () =>
  request<TeamStatus>("/team/status");

export const getConnections = () =>
  request<Connection[]>("/connections");

export const sendChat = (message: string, senderName: string = "Admin", teamCode?: string) =>
  request<{ reply: string; intent?: any }>("/chat", {
    method: "POST",
    body: JSON.stringify({ message, sender_name: senderName, channel: "app", team_code: teamCode }),
  });

export const sendDirectMessage = (payload: {
  sender_id: number;
  recipient_id: number;
  team_code: string;
  message: string;
}) => request<{ status: string; notification_id: number; recipient: string }>("/messages/direct", {
  method: "POST",
  body: JSON.stringify(payload),
});

export interface ExtractedTaskPreview {
  title: string;
  owner_id: number | null;
  owner_name: string;
  owner_role: string;
  priority: string;
  deadline_str: string;
  deadline_iso: string;
}

export interface VoiceAnalysisPreview {
  transcript: string;
  summary: string;
  extracted_task: ExtractedTaskPreview | null;
  sender: string;
}

export const analyzeVoiceDirective = async (transcript: string, senderName: string, teamCode?: string) => {
  return request<VoiceAnalysisPreview>("/audio/analyze-directive", {
    method: "POST",
    body: JSON.stringify({ transcript, sender_name: senderName, team_code: teamCode }),
  });
};

export const confirmVoiceTransfer = async (payload: {
  title: string;
  owner_id: number;
  deadline_iso?: string;
  description?: string;
  priority?: string;
  team_code?: string;
}) => {
  return request<{ status: string; task_id: number; title: string; owner_name: string; deadline: string; message: string }>("/audio/confirm-transfer", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const transcribeVoiceAudio = async (audioBlob: Blob): Promise<string> => {
  const form = new FormData();
  form.append("file", audioBlob, "recording.webm");
  const res = await fetch(`${API_URL}/audio/transcribe-voice`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Transcription service unavailable (${res.status})`);
  }
  const data = await res.json();
  return data.transcript || "";
};

export const transcribeNativeAudioFile = async (uri: string): Promise<string> => {
  const form = new FormData();
  const filename = uri.split("/").pop() || "recording.m4a";
  const extension = filename.split(".").pop()?.toLowerCase();
  const contentType = extension === "webm" ? "audio/webm" : extension === "wav" ? "audio/wav" : "audio/mp4";
  form.append("file", { uri, name: filename, type: contentType } as any);
  const res = await fetch(`${API_URL}/audio/transcribe-voice`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Transcription service unavailable (${res.status})`);
  }
  const data = await res.json();
  return data.transcript || "";
};

export const sendSTTDirective = async (transcript: string, senderName: string, teamCode?: string) => {
  return request<VoiceUploadResult>("/audio/stt-route", {
    method: "POST",
    body: JSON.stringify({ transcript, sender_name: senderName, team_code: teamCode }),
  });
};

export const uploadVoiceNote = async (uri: string, senderName: string, transcriptText?: string) => {
  const form = new FormData();
  form.append("sender_name", senderName);
  if (transcriptText) {
    form.append("transcript", transcriptText);
  }
  if (uri) {
    const filename = uri.split("/").pop() || "voice-note.m4a";
    const extension = filename.split(".").pop()?.toLowerCase();
    const contentType = extension === "webm" ? "audio/webm" : extension === "wav" ? "audio/wav" : "audio/mp4";
    form.append("file", { uri, name: filename, type: contentType } as any);
  }

  const response = await fetch(`${API_URL}/audio/transcribe-and-route`, {
    method: "POST",
    body: form,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.detail || `Voice upload failed (${response.status})`);
  return data as VoiceUploadResult;
};

export const getNotifications = (userId?: number) =>
  request<any[]>(`/notifications${userId ? `?user_id=${userId}` : ""}`);

export const getEvents = () =>
  request<any[]>("/events");

// ==================== 1-CLICK INTEGRATIONS ====================

export const oneClickSlack = () =>
  request<Connection>("/connections/slack/one-click", { method: "POST" });

export const oneClickEmail = () =>
  request<Connection>("/connections/email/one-click", { method: "POST" });

// ==================== VOICE TTS ====================

export const getTaskAudioUrl = (taskId: number) => `${API_URL}/tasks/${taskId}/audio`;

export const playSpeechText = async (text: string) => {
  const url = `${API_URL}/voice/tts`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error("TTS playback failed");
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

