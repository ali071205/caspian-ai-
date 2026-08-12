import React from 'react';
import { HomeScreen } from './HomeScreen';
import { CalendarScreen } from './CalendarScreen';
import { TaskDetailScreen } from './TaskDetailScreen';

interface ThreeScreenShowcaseProps {
  onNavigateToCalendar?: () => void;
  onNavigateToDetail?: () => void;
}

export const ThreeScreenShowcase: React.FC<ThreeScreenShowcaseProps> = ({
  onNavigateToCalendar,
  onNavigateToDetail,
}) => {
  return (
    <div className="three-screen-grid">
      {/* Screen 1: Dashboard Home */}
      <div>
        <div className="phone-frame">
          <HomeScreen 
            onNavigateToCalendar={onNavigateToCalendar} 
            onNavigateToDetail={onNavigateToDetail} 
          />
        </div>
        <div className="screen-label">Dashboard View (Home)</div>
      </div>

      {/* Screen 2: Calendar Schedule */}
      <div>
        <div className="phone-frame">
          <CalendarScreen 
            onBack={onNavigateToCalendar} 
            onSelectEvent={onNavigateToDetail} 
          />
        </div>
        <div className="screen-label">Calendar & Schedule View</div>
      </div>

      {/* Screen 3: Meeting Plan / Task Details */}
      <div>
        <div className="phone-frame">
          <TaskDetailScreen onClose={onNavigateToDetail} />
        </div>
        <div className="screen-label">Meeting Plan & Details Modal</div>
      </div>
    </div>
  );
};
