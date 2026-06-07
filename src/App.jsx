import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import TaskBoard from './components/TaskBoard';
import TaskList from './components/TaskList';
import Dashboard from './components/Dashboard';
import ActivityFeed from './components/ActivityFeed';
import './index.css';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  if (loading) {
    return <div className="auth-container">Loading...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  return <MainLayout session={session} toggleTheme={toggleTheme} theme={theme} />;
}

// Giao diện Đăng nhập / Đăng ký
function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    let error;

    if (isLogin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      error = signInError;
    } else {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      error = signUpError;
      if (!error) {
        alert("Đăng ký thành công! Vui lòng kiểm tra email để xác nhận (nếu Supabase yêu cầu), hoặc đăng nhập ngay.");
        setIsLogin(true);
      }
    }

    if (error) alert(error.message);
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        <h2>TA Task Manager</h2>
        <p style={{color: 'var(--text-secondary)', marginBottom: '24px'}}>
          {isLogin ? 'Sign in to manage tasks' : 'Create a new account'}
        </p>
        <form onSubmit={handleAuth}>
          <div className="input-group">
            <label>Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} minLength="6" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
          
          <div style={{ marginTop: '16px', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)} 
              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Layout chính chứa Sidebar và thay đổi nội dung
function MainLayout({ session, toggleTheme, theme }) {
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px 20px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>
            TA
          </div>
          <h3 style={{ fontSize: '1.2rem', letterSpacing: '0.5px' }}>TaskFlow</h3>
        </div>
        
        <ul className="nav-menu" style={{ listStyle: 'none', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li 
            className={activeTab === 'DASHBOARD' ? 'active' : ''} 
            onClick={() => setActiveTab('DASHBOARD')}
            style={{ 
              padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', 
              backgroundColor: activeTab === 'DASHBOARD' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'DASHBOARD' ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>📊</span> Dashboard
          </li>
          <li 
            className={activeTab === 'TASK_BOARD' ? 'active' : ''} 
            onClick={() => setActiveTab('TASK_BOARD')}
            style={{ 
              padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', 
              backgroundColor: activeTab === 'TASK_BOARD' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'TASK_BOARD' ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>📋</span> Kanban Board
          </li>
          <li 
            className={activeTab === 'TASK_LIST' ? 'active' : ''} 
            onClick={() => setActiveTab('TASK_LIST')}
            style={{ 
              padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', 
              backgroundColor: activeTab === 'TASK_LIST' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'TASK_LIST' ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>📝</span> List View
          </li>
          <li 
            className={activeTab === 'ACTIVITY' ? 'active' : ''} 
            onClick={() => setActiveTab('ACTIVITY')}
            style={{ 
              padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', 
              backgroundColor: activeTab === 'ACTIVITY' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'ACTIVITY' ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🕒</span> Activity Logs
          </li>
        </ul>
        
        <div style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', wordBreak: 'break-all' }}>
            {session.user.email}
          </p>
          <button 
            className="btn glass-panel" 
            onClick={() => supabase.auth.signOut()}
            style={{ width: '100%', color: 'var(--text-main)', display: 'flex', justifyContent: 'center', gap: '8px' }}
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* Top Header */}
        <header className="header glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', margin: '0 0 24px 0', borderRadius: '0', borderLeft: 'none', borderRight: 'none', borderTop: 'none', zIndex: 10 }}>
          <h2 style={{ fontSize: '1.4rem' }}>
            {activeTab === 'DASHBOARD' ? 'Recruitment Dashboard' : 
             activeTab === 'TASK_BOARD' ? 'Task Board' : 
             activeTab === 'ACTIVITY' ? 'System Activity Logs' :
             'Task List (Admin)'}
          </h2>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button 
              className="btn glass-panel" 
              onClick={toggleTheme}
              style={{ padding: '8px 12px', fontSize: '1.2rem', color: 'var(--text-main)' }}
              title="Toggle Theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                🔔
              </div>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>
                {session.user.email.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic View Content */}
        <div className="content-area" style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px 32px' }}>
          {activeTab === 'DASHBOARD' && <Dashboard session={session} />}
          {activeTab === 'TASK_BOARD' && <TaskBoard session={session} />}
          {activeTab === 'TASK_LIST' && <TaskList session={session} />}
          {activeTab === 'ACTIVITY' && <ActivityFeed />}
        </div>
        
      </div>
    </div>
  );
}

export default App;
