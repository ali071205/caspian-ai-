export interface Member {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface PlanItem {
  id: string;
  title: string;
  timeRange: string;
  color: "purple" | "yellow" | "pink";
  completed: boolean;
}

export const membersData: Member[] = [
  { id: "m1", name: "Antony Jacob", role: "Product Lead", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
  { id: "m2", name: "Wade Warren", role: "UX Researcher", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
  { id: "m3", name: "Leslie Alexander", role: "UI Designer", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
  { id: "m4", name: "Kristin Watson", role: "Product Designer", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" },
  { id: "m5", name: "Eleanor Pena", role: "Frontend Dev", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80" },
  { id: "m6", name: "Guy Hawkins", role: "Design Lead", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
  { id: "m7", name: "Cody Fisher", role: "Backend Eng", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80" },
  { id: "m8", name: "Jane Cooper", role: "QA Lead", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80" },
];

export const initialPlanItems: PlanItem[] = [
  { id: "p1", title: "Discussion on Client Requirements", timeRange: "11:30 - 12:00", color: "purple", completed: false },
  { id: "p2", title: "Organizing Team Roles for Project Success", timeRange: "12:00 - 12:30", color: "yellow", completed: false },
  { id: "p3", title: "Meeting Outcomes and Summary", timeRange: "12:30 - 01:00", color: "pink", completed: false },
];
