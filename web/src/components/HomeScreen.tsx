import React from 'react';
import { 
  Bell, 
  Plus, 
  ArrowUpRight, 
  Home, 
  Calendar, 
  Grid, 
  User, 
  Wifi, 
  Battery, 
  Hourglass, 
  HelpCircle, 
  Heart,
  Sparkles
} from 'lucide-react';
import { mockMembers } from '../data/mockData';

interface HomeScreenProps {
  onNavigateToCalendar?: () => void;
  onNavigateToDetail?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ 
  onNavigateToCalendar, 
  onNavigateToDetail 
}) => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Phone Status Bar */}
      <div className="status-bar">
        <span>9:41</span>
        <div className="status-bar-icons">
          <Wifi size={14} />
          <Battery size={14} />
        </div>
      </div>

      {/* Screen Content Scrollable */}
      <div className="screen-content">
        <div className="home-container">
          
          {/* Header */}
          <div className="home-header">
            <div className="profile-info">
              <img 
                src={mockMembers[0].avatar} 
                alt="Antony Jacob" 
                className="avatar-main" 
              />
              <div>
                <div className="greeting-text">Good Morning !</div>
                <div className="user-name">Antony Jacob</div>
              </div>
            </div>
            <button className="bell-btn" aria-label="Notifications">
              <Bell size={18} color="#333" />
              <div className="notification-dot"></div>
            </button>
          </div>

          {/* Hero Title */}
          <div className="home-hero-title">
            <span className="light">You have 3</span>
            <span className="bold">task for today</span>
          </div>

          {/* Members Section */}
          <div className="members-section">
            <div className="members-header">
              <span className="members-title">8 Members</span>
              <button className="add-member-btn" title="Add Member">
                <Plus size={16} />
              </button>
            </div>
            <div className="members-avatars-row">
              {mockMembers.map((member) => (
                <img
                  key={member.id}
                  src={member.avatar}
                  alt={member.name}
                  title={`${member.name} (${member.role})`}
                  className="member-avatar-circle"
                />
              ))}
            </div>
          </div>

          {/* Next Task Section */}
          <div className="next-task-section">
            <div className="next-task-heading">Next Task</div>
            
            {/* Stacked 3D depth wrapper */}
            <div className="stacked-card-wrapper">
              <div className="hero-task-card" onClick={onNavigateToDetail} style={{ cursor: 'pointer' }}>
                <div className="hero-card-top">
                  <div>
                    <div className="hero-card-title">Healthcare Dashboard UI</div>
                    <div className="hero-card-subtitle">Design Team</div>
                  </div>
                </div>

                {/* 3D Graphics Illustration */}
                <div className="hero-card-illustration">
                  <div className="isometric-box">
                    <Sparkles size={28} color="#ffffff" />
                  </div>
                  
                  <div className="floating-icon-bubble bubble-qmark">
                    <HelpCircle size={16} />
                  </div>
                  
                  <div className="floating-icon-bubble bubble-hourglass">
                    <Hourglass size={14} />
                  </div>
                  
                  <div className="floating-icon-bubble bubble-heart">
                    <Heart size={13} fill="#ffffff" />
                  </div>
                </div>

                {/* Card Bottom */}
                <div className="hero-card-bottom">
                  <div className="hero-assigned-stack">
                    <div className="stack-avatars">
                      <img src={mockMembers[2].avatar} alt="Member" className="stack-avatar" />
                      <img src={mockMembers[3].avatar} alt="Member" className="stack-avatar" />
                      <img src={mockMembers[5].avatar} alt="Member" className="stack-avatar" />
                    </div>
                  </div>

                  <button 
                    className="card-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onNavigateToDetail) onNavigateToDetail();
                    }}
                    title="View Task Details"
                  >
                    <ArrowUpRight size={22} />
                  </button>
                </div>
              </div>

              {/* Stacked depth background card */}
              <div className="card-depth-layer"></div>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Bottom Navigation Bar */}
      <div className="bottom-nav-container">
        <div className="bottom-nav-bar">
          <button className="nav-item active" title="Home">
            <Home size={20} />
          </button>
          <button 
            className="nav-item" 
            onClick={onNavigateToCalendar} 
            title="Calendar"
          >
            <Calendar size={20} />
          </button>
          <button className="nav-item" title="Tasks Grid">
            <Grid size={20} />
          </button>
          <button className="nav-item" title="Profile">
            <User size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
