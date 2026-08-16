import React, { useState } from 'react';
import { 
  Shield, 
  Users, 
  Mail, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  X, 
  RefreshCw
} from 'lucide-react';

interface AuthGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (userData: any) => void;
}

export const AuthGatewayModal: React.FC<AuthGatewayModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'member'>('admin');
  
  // Admin State
  const [adminMode, setAdminMode] = useState<'login' | 'otp' | 'signup'>('login');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('Ali');
  const [workspaceName, setWorkspaceName] = useState('Caspian Sentinel Team');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Member State
  const [memberMode, setMemberMode] = useState<'login' | 'join'>('login');
  const [memberName, setMemberName] = useState('');
  const [teamCode, setTeamCode] = useState('CASPIAN-2026');
  const [teamVerified, setTeamVerified] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberContact, setMemberContact] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [memberSkills, setMemberSkills] = useState('');

  // Status / Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const resetFeedback = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  // ================= ADMIN HANDLERS =================
  const handleAdminPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();
    try {
      const res = await fetch('http://localhost:8000/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail || 'ali@company.com', password: adminPassword || 'admin123' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      setSuccessMsg(`Welcome Admin ${data.name}! Team Code: ${data.team_code}`);
      setTimeout(() => {
        onAuthSuccess(data);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!adminEmail) {
      setErrorMsg('Please enter your admin email address first.');
      return;
    }
    setLoading(true);
    resetFeedback();
    try {
      const res = await fetch('http://localhost:8000/auth/admin/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail })
      });
      const data = await res.json();
      setOtpSent(true);
      setSuccessMsg(data.message || `Verification code sent to ${adminEmail}!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch email code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();
    try {
      const res = await fetch('http://localhost:8000/auth/admin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, token_code: otpCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid verification code');
      setSuccessMsg(`Verification successful! Welcome Admin ${data.name}.`);
      setTimeout(() => {
        onAuthSuccess(data);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();
    try {
      const res = await fetch('http://localhost:8000/auth/admin/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
          name: adminName,
          workspace_name: workspaceName
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Admin signup failed');
      setSuccessMsg(`Workspace created! Team Code: ${data.team_code}`);
      setTimeout(() => {
        onAuthSuccess(data);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Signup error');
    } finally {
      setLoading(false);
    }
  };

  // ================= MEMBER HANDLERS =================
  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();
    try {
      const res = await fetch('http://localhost:8000/auth/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: memberName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Member login failed');
      setSuccessMsg(`Welcome back, ${data.name}!`);
      setTimeout(() => {
        onAuthSuccess(data);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Member login error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTeamCode = async () => {
    setLoading(true);
    resetFeedback();
    try {
      const res = await fetch('http://localhost:8000/team/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_code: teamCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid Team Code');
      setTeamVerified(true);
      setSuccessMsg(`Team Code Verified: ${data.team_name}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid Team Code.');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetFeedback();
    try {
      const res = await fetch('http://localhost:8000/team/join-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_code: teamCode,
          name: memberName,
          email: memberEmail,
          contact: memberContact,
          role: memberRole,
          skills_description: memberSkills
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Join request failed');
      setSuccessMsg(data.message || 'Join request submitted! Awaiting Admin approval.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting join request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(10, 11, 16, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#161824',
        border: '1px solid rgba(124, 105, 239, 0.3)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        overflow: 'hidden',
        color: '#f0f2f8'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1c1a35 0%, #161824 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c69ef, #5038ee)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px' }}>Caspian Sentinel Auth</div>
              <div style={{ fontSize: '12px', color: '#9aa5b8' }}>Secure Workspace Gateway</div>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#9aa5b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Top Role Selector Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: '#12141d' }}>
          <button
            onClick={() => { setActiveTab('admin'); resetFeedback(); }}
            style={{
              flex: 1,
              padding: '14px',
              background: activeTab === 'admin' ? '#161824' : 'transparent',
              color: activeTab === 'admin' ? '#a797ff' : '#78859b',
              border: 'none',
              borderBottom: activeTab === 'admin' ? '2px solid #7c69ef' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Shield size={16} />
            <span>Login as Admin</span>
          </button>
          <button
            onClick={() => { setActiveTab('member'); resetFeedback(); }}
            style={{
              flex: 1,
              padding: '14px',
              background: activeTab === 'member' ? '#161824' : 'transparent',
              color: activeTab === 'member' ? '#a797ff' : '#78859b',
              border: 'none',
              borderBottom: activeTab === 'member' ? '2px solid #7c69ef' : '2px solid transparent',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Users size={16} />
            <span>Login as Team Member</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#4ade80',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ================= TAB 1: ADMIN ================= */}
          {activeTab === 'admin' && (
            <div>
              {/* Sub Mode Nav */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button
                  onClick={() => { setAdminMode('login'); resetFeedback(); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: adminMode === 'login' ? '#7c69ef' : '#212433',
                    color: '#fff',
                    border: 'none'
                  }}
                >
                  Password Login
                </button>
                <button
                  onClick={() => { setAdminMode('otp'); resetFeedback(); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: adminMode === 'otp' ? '#7c69ef' : '#212433',
                    color: '#fff',
                    border: 'none'
                  }}
                >
                  Email Code / Forgot Password
                </button>
                <button
                  onClick={() => { setAdminMode('signup'); resetFeedback(); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: adminMode === 'signup' ? '#7c69ef' : '#212433',
                    color: '#fff',
                    border: 'none'
                  }}
                >
                  New Admin
                </button>
              </div>

              {/* 1A. Admin Password Login */}
              {adminMode === 'login' && (
                <form onSubmit={handleAdminPasswordLogin}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#9aa5b8', marginBottom: '6px' }}>Admin Email</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        placeholder="ali@company.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 36px',
                          background: '#0e1017',
                          border: '1px solid #2d3142',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                      <Mail size={16} color="#78859b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#9aa5b8', marginBottom: '6px' }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 36px',
                          background: '#0e1017',
                          border: '1px solid #2d3142',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                      <Lock size={16} color="#78859b" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #7c69ef, #5038ee)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {loading ? <RefreshCw className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                    <span>Log in as Admin</span>
                  </button>
                </form>
              )}

              {/* 1B. Admin OTP Code Verification (Forgot Password / Passwordless) */}
              {adminMode === 'otp' && (
                <form onSubmit={handleVerifyOtp}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#9aa5b8', marginBottom: '6px' }}>Admin Email</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="email"
                        placeholder="ali@company.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          background: '#0e1017',
                          border: '1px solid #2d3142',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '14px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={loading}
                        style={{
                          padding: '10px 14px',
                          background: '#2d3142',
                          color: '#a797ff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {otpSent ? 'Resend' : 'Send Code'}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#9aa5b8', marginBottom: '6px' }}>
                      6-Digit Supabase Email OTP Code
                    </label>
                    <input
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#0e1017',
                        border: '2px dashed #7c69ef',
                        borderRadius: '8px',
                        color: '#a797ff',
                        fontSize: '20px',
                        fontWeight: 700,
                        letterSpacing: '8px',
                        textAlign: 'center',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ fontSize: '11px', color: '#78859b', marginTop: '6px' }}>
                      Check your email inbox or use Supabase verification code.
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !otpCode}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #7c69ef, #5038ee)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>Verify Code & Login</span>
                  </button>
                </form>
              )}

              {/* 1C. Admin Signup */}
              {adminMode === 'signup' && (
                <form onSubmit={handleAdminSignup}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#9aa5b8', marginBottom: '4px' }}>Name</label>
                      <input
                        type="text"
                        placeholder="Ali"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        style={{ width: '100%', padding: '10px', background: '#0e1017', border: '1px solid #2d3142', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#9aa5b8', marginBottom: '4px' }}>Workspace Name</label>
                      <input
                        type="text"
                        placeholder="Team Alpha"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        style={{ width: '100%', padding: '10px', background: '#0e1017', border: '1px solid #2d3142', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#9aa5b8', marginBottom: '4px' }}>Admin Email</label>
                    <input
                      type="email"
                      placeholder="admin@company.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: '#0e1017', border: '1px solid #2d3142', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#9aa5b8', marginBottom: '4px' }}>Password</label>
                    <input
                      type="password"
                      placeholder="Create secure password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: '#0e1017', border: '1px solid #2d3142', borderRadius: '8px', color: '#fff', boxSizing: 'border-box' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #7c69ef, #5038ee)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    <span>Register Admin & Generate Team Code</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ================= TAB 2: TEAM MEMBER ================= */}
          {activeTab === 'member' && (
            <div>
              {/* Sub Mode Nav */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button
                  onClick={() => { setMemberMode('login'); resetFeedback(); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: memberMode === 'login' ? '#7c69ef' : '#212433',
                    color: '#fff',
                    border: 'none'
                  }}
                >
                  Member Login
                </button>
                <button
                  onClick={() => { setMemberMode('join'); resetFeedback(); }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: memberMode === 'join' ? '#7c69ef' : '#212433',
                    color: '#fff',
                    border: 'none'
                  }}
                >
                  Have Team Code? Join
                </button>
              </div>

              {/* 2A. Existing Member Login */}
              {memberMode === 'login' && (
                <form onSubmit={handleMemberLogin}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#9aa5b8', marginBottom: '6px' }}>Your Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul, Neha, or Sumeet"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#0e1017',
                        border: '1px solid #2d3142',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !memberName}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #7c69ef, #5038ee)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>Log in to Team Workspace</span>
                  </button>
                </form>
              )}

              {/* 2B. Self-Serve Join with Team Code */}
              {memberMode === 'join' && (
                <div>
                  {!teamVerified ? (
                    <div>
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#9aa5b8', marginBottom: '6px' }}>
                          Enter Team Code Provided by Admin
                        </label>
                        <input
                          type="text"
                          placeholder="CASPIAN-2026"
                          value={teamCode}
                          onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: '#0e1017',
                            border: '2px solid #7c69ef',
                            borderRadius: '8px',
                            color: '#a797ff',
                            fontSize: '18px',
                            fontWeight: 700,
                            letterSpacing: '2px',
                            textAlign: 'center',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyTeamCode}
                        disabled={loading || !teamCode}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '8px',
                          background: '#7c69ef',
                          color: '#fff',
                          border: 'none',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Verify Team Code
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleMemberJoinRequest}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#9aa5b8', marginBottom: '4px' }}>Full Name</label>
                          <input
                            type="text"
                            placeholder="Kavya Sharma"
                            required
                            value={memberName}
                            onChange={(e) => setMemberName(e.target.value)}
                            style={{ width: '100%', padding: '8px', background: '#0e1017', border: '1px solid #2d3142', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#9aa5b8', marginBottom: '4px' }}>Email</label>
                          <input
                            type="email"
                            placeholder="kavya@company.com"
                            required
                            value={memberEmail}
                            onChange={(e) => setMemberEmail(e.target.value)}
                            style={{ width: '100%', padding: '8px', background: '#0e1017', border: '1px solid #2d3142', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#9aa5b8', marginBottom: '4px' }}>Contact / Phone</label>
                          <input
                            type="text"
                            placeholder="+91 98765 43210"
                            value={memberContact}
                            onChange={(e) => setMemberContact(e.target.value)}
                            style={{ width: '100%', padding: '8px', background: '#0e1017', border: '1px solid #2d3142', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#9aa5b8', marginBottom: '4px' }}>Role</label>
                          <input
                            type="text"
                            placeholder="QA Lead"
                            required
                            value={memberRole}
                            onChange={(e) => setMemberRole(e.target.value)}
                            style={{ width: '100%', padding: '8px', background: '#0e1017', border: '1px solid #2d3142', borderRadius: '6px', color: '#fff', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: '#9aa5b8', marginBottom: '4px' }}>
                          Skills & Work Description (Helps AI route tasks to you)
                        </label>
                        <textarea
                          placeholder="e.g. Playwright, Cypress, API test automation, load testing, performance regression"
                          value={memberSkills}
                          onChange={(e) => setMemberSkills(e.target.value)}
                          rows={2}
                          style={{
                            width: '100%',
                            padding: '8px',
                            background: '#0e1017',
                            border: '1px solid #2d3142',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '12px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #7c69ef, #5038ee)',
                          color: '#fff',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        <span>Submit Profile for Admin Approval</span>
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
