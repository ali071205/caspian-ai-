import { useState } from 'react';
import { ThreeScreenShowcase } from './components/ThreeScreenShowcase';
import { HomeScreen } from './components/HomeScreen';
import { CalendarScreen } from './components/CalendarScreen';
import { TaskDetailScreen } from './components/TaskDetailScreen';
import { LayoutGrid, Smartphone, Calendar as CalendarIcon, FileText, CheckCircle2 } from 'lucide-react';
import './index.css';

type ViewMode = 'showcase' | 'simulator' | 'home' | 'calendar' | 'detail';
type SimulatorTab = 'home' | 'calendar' | 'detail';

export function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('showcase');
  const [simTab, setSimTab] = useState<SimulatorTab>('home');

  const handleGoCalendar = () => {
    setViewMode('simulator');
    setSimTab('calendar');
  };

  const handleGoDetail = () => {
    setViewMode('simulator');
    setSimTab('detail');
  };

  const handleGoHome = () => {
    setViewMode('simulator');
    setSimTab('home');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Web Control Header */}
      <header className="web-header">
        <div className="brand-title">
          <CheckCircle2 color="#7c69ef" size={24} />
          <span>Caspian TeamOps</span>
          <span className="brand-badge">Ditto UI Preview</span>
        </div>

        {/* View Switcher Controls */}
        <div className="mode-switcher">
          <button 
            className={`mode-btn ${viewMode === 'showcase' ? 'active' : ''}`}
            onClick={() => setViewMode('showcase')}
            title="View 3 screens side-by-side like reference image"
          >
            <LayoutGrid size={15} />
            <span>Ditto 3-Screen View</span>
          </button>

          <button 
            className={`mode-btn ${viewMode === 'simulator' ? 'active' : ''}`}
            onClick={() => setViewMode('simulator')}
            title="Interactive single mobile screen simulator"
          >
            <Smartphone size={15} />
            <span>Interactive Simulator</span>
          </button>

          <button 
            className={`mode-btn ${viewMode === 'home' ? 'active' : ''}`}
            onClick={() => setViewMode('home')}
          >
            <span>Home</span>
          </button>

          <button 
            className={`mode-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon size={15} />
            <span>Calendar</span>
          </button>

          <button 
            className={`mode-btn ${viewMode === 'detail' ? 'active' : ''}`}
            onClick={() => setViewMode('detail')}
          >
            <FileText size={15} />
            <span>Plan Modal</span>
          </button>
        </div>
      </header>

      {/* Main Presentation Container */}
      <main className="presentation-container">
        {viewMode === 'showcase' && (
          <ThreeScreenShowcase 
            onNavigateToCalendar={handleGoCalendar} 
            onNavigateToDetail={handleGoDetail} 
          />
        )}

        {viewMode === 'simulator' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="phone-frame">
              {simTab === 'home' && (
                <HomeScreen 
                  onNavigateToCalendar={() => setSimTab('calendar')}
                  onNavigateToDetail={() => setSimTab('detail')}
                />
              )}
              {simTab === 'calendar' && (
                <CalendarScreen 
                  onBack={() => setSimTab('home')}
                  onSelectEvent={() => setSimTab('detail')}
                />
              )}
              {simTab === 'detail' && (
                <TaskDetailScreen 
                  onClose={() => setSimTab('calendar')}
                />
              )}
            </div>
            <div className="screen-label">
              Interactive Phone Simulator · Active: {simTab.toUpperCase()}
            </div>
          </div>
        )}

        {viewMode === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="phone-frame">
              <HomeScreen 
                onNavigateToCalendar={handleGoCalendar}
                onNavigateToDetail={handleGoDetail}
              />
            </div>
            <div className="screen-label">Dashboard View (Home Screen)</div>
          </div>
        )}

        {viewMode === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="phone-frame">
              <CalendarScreen 
                onBack={handleGoHome}
                onSelectEvent={handleGoDetail}
              />
            </div>
            <div className="screen-label">Calendar & Schedule View</div>
          </div>
        )}

        {viewMode === 'detail' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="phone-frame">
              <TaskDetailScreen 
                onClose={handleGoCalendar}
              />
            </div>
            <div className="screen-label">Meeting Plan & Task Detail View</div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
