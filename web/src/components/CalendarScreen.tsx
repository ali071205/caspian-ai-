import React, { useState } from 'react';
import { 
  ChevronLeft, 
  MoreVertical, 
  Clock, 
  Wifi, 
  Battery 
} from 'lucide-react';
import { mockMembers } from '../data/mockData';

interface CalendarScreenProps {
  onBack?: () => void;
  onSelectEvent?: (eventId: string) => void;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({ 
  onBack, 
  onSelectEvent 
}) => {
  const [selectedDay, setSelectedDay] = useState(21);

  const days = [
    { num: 18, day: 'Mon' },
    { num: 19, day: 'Tue' },
    { num: 20, day: 'Wed' },
    { num: 21, day: 'Thu' },
    { num: 22, day: 'Fri' },
    { num: 23, day: 'Sat' },
    { num: 24, day: 'Sun' },
  ];

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
        <div className="calendar-container">
          
          {/* Header */}
          <div className="calendar-header">
            <button className="icon-btn-round" onClick={onBack} title="Back to Home">
              <ChevronLeft size={20} />
            </button>
            <div className="calendar-title">Calendar</div>
            <button className="icon-btn-round" title="Menu Options">
              <MoreVertical size={18} />
            </button>
          </div>

          {/* Month Label */}
          <div className="month-label">August</div>

          {/* Date Strip */}
          <div className="date-strip">
            {days.map((item) => (
              <div 
                key={item.num}
                className={`date-capsule ${selectedDay === item.num ? 'active' : ''}`}
                onClick={() => setSelectedDay(item.num)}
              >
                <span className="day-num">{item.num}</span>
                <span className="day-name">{item.day}</span>
              </div>
            ))}
          </div>

          {/* Timeline Schedule List */}
          <div className="timeline-list">
            
            {/* 09.00 AM Row */}
            <div className="timeline-row">
              <div className="time-label">09.00 AM</div>
              
              {/* Event 1: Research Plan (Pink) */}
              <div className="event-card pink">
                <div className="event-card-top">
                  <div>
                    <div className="event-card-title">Research Plan</div>
                    <div className="event-card-time">
                      <Clock size={12} />
                      <span>09.30-10.45</span>
                    </div>
                  </div>
                  <MoreVertical size={16} style={{ opacity: 0.8 }} />
                </div>

                <div className="event-assigned-row">
                  <div>
                    <div className="assigned-label">Assigned to</div>
                    <div className="assigned-user-info">
                      <img 
                        src={mockMembers[1].avatar} 
                        alt="Wade Warren" 
                        className="user-mini-avatar" 
                      />
                      <span className="user-mini-name">Wade Warren</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 11.00 AM Row with 11:30 AM Badge */}
            <div className="timeline-row">
              <div className="time-label">
                <div className="time-badge-pill">11:30 AM</div>
              </div>

              {/* Event 2: Team Meeting (Yellow) */}
              <div 
                className="event-card yellow"
                onClick={() => {
                  if (onSelectEvent) onSelectEvent('e2');
                }}
              >
                <div className="event-card-top">
                  <div>
                    <div className="event-card-title">Team Meeting</div>
                    <div className="event-card-time">
                      <Clock size={12} />
                      <span>11.30-12.00</span>
                    </div>
                  </div>
                  <MoreVertical size={16} style={{ opacity: 0.8 }} />
                </div>

                <div className="event-assigned-row">
                  <div className="avatar-stack-mini">
                    <img src={mockMembers[0].avatar} alt="Member" className="stack-img" />
                    <img src={mockMembers[2].avatar} alt="Member" className="stack-img" />
                    <img src={mockMembers[3].avatar} alt="Member" className="stack-img" />
                    <div className="stack-more-badge">+3</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 12.00 PM Indicator */}
            <div className="timeline-row">
              <div className="time-label">12.00 PM</div>
            </div>

            {/* 01.00 PM Row */}
            <div className="timeline-row">
              <div className="time-label">01.00 PM</div>

              {/* Event 3: Design Review on... (Blue) */}
              <div className="event-card blue">
                <div className="event-card-top">
                  <div>
                    <div className="event-card-title">Design Review on...</div>
                    <div className="event-card-time">
                      <Clock size={12} />
                      <span>13.00-13.30</span>
                    </div>
                  </div>
                  <MoreVertical size={16} style={{ opacity: 0.8 }} />
                </div>

                <div className="event-assigned-row">
                  <div>
                    <div className="assigned-label">Assigned to</div>
                    <div className="assigned-user-info">
                      <img 
                        src={mockMembers[2].avatar} 
                        alt="Leslie Alexander" 
                        className="user-mini-avatar" 
                      />
                      <span className="user-mini-name">Leslie Alexander</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 02.30 PM Row */}
            <div className="timeline-row">
              <div className="time-label">02.30 PM</div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
