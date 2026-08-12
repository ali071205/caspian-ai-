import React, { useState } from 'react';
import { 
  X, 
  Edit3, 
  Wifi, 
  Battery 
} from 'lucide-react';
import { mockMembers, mockPlanItems } from '../data/mockData';
import type { PlanItem } from '../types';

interface TaskDetailScreenProps {
  onClose?: () => void;
}

export const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ onClose }) => {
  const [plans, setPlans] = useState<PlanItem[]>(mockPlanItems);

  const togglePlanComplete = (id: string) => {
    setPlans(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Status Bar */}
      <div className="status-bar">
        <span>9:41</span>
        <div className="status-bar-icons">
          <Wifi size={14} />
          <Battery size={14} />
        </div>
      </div>

      {/* Screen Content */}
      <div className="screen-content">
        <div className="detail-container">
          
          {/* Header Bar */}
          <div className="detail-header">
            <button className="icon-btn-round" onClick={onClose} title="Close">
              <X size={18} />
            </button>
            <button className="icon-btn-round" title="Edit Plan">
              <Edit3 size={16} />
            </button>
          </div>

          {/* Time Badge */}
          <div className="time-range-badge-center">
            <div className="time-range-pill">11:30 AM - 12:00 PM</div>
          </div>

          {/* Title & Subtitle */}
          <div className="meeting-title-block">
            <h2 className="meeting-main-title">Team Meeting</h2>
            <p className="meeting-subtitle">Discussion of tasks for the month</p>
          </div>

          {/* Attendees Avatar Stack */}
          <div className="attendees-stack-center">
            <img src={mockMembers[0].avatar} alt="Attendee" className="attendees-avatar" />
            <img src={mockMembers[1].avatar} alt="Attendee" className="attendees-avatar" />
            <img src={mockMembers[2].avatar} alt="Attendee" className="attendees-avatar" />
            <div className="attendees-more-badge">+5</div>
          </div>

          {/* Plan Section */}
          <div className="plan-section">
            <div className="plan-section-title">Plan</div>
            
            <div className="plan-cards-list">
              {plans.map((item) => (
                <div
                  key={item.id}
                  className={`plan-card ${item.color} ${item.completed ? 'completed' : ''}`}
                  onClick={() => togglePlanComplete(item.id)}
                  title="Click to toggle completion"
                >
                  <div className={`plan-card-text ${item.completed ? 'strike' : ''}`}>
                    {item.title}
                  </div>
                  <div className="plan-card-time">
                    {item.timeRange}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
