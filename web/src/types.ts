export interface Member {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface TaskItem {
  id: string;
  title: string;
  category: string;
  time?: string;
  color?: string;
  assignedMembers: Member[];
  completed?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color: 'pink' | 'yellow' | 'blue' | 'purple';
  assignedTo?: Member;
  assignedMembers?: Member[];
  extraCount?: number;
}

export interface PlanItem {
  id: string;
  title: string;
  timeRange: string;
  color: 'purple' | 'yellow' | 'pink';
  completed: boolean;
}
