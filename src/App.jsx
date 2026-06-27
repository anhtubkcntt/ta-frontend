import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import TaskBoard from './components/TaskBoard';
import TaskList from './components/TaskList';
import Dashboard from './components/Dashboard';
import ActivityFeed from './components/ActivityFeed';
import BackupModal from './components/BackupModal';
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
    const themes = ['dark', 'light', 'pink'];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    const newTheme = themes[nextIndex];
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

// Giao diện Đăng nhập
function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        <h2>TA Task Manager</h2>
        <p style={{color: 'var(--text-secondary)', marginBottom: '24px'}}>
          Sign in to manage tasks
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
            {loading ? 'Processing...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Layout chính chứa Sidebar và thay đổi nội dung
function MainLayout({ session, toggleTheme, theme }) {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const userEmail = session?.user?.email || '';
  const isAdmin = true; // All users have admin rights (create, edit, change assignees)

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${session.user.id}`
      }, payload => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };
  
  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

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
        </ul>
        
        <div style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid var(--border-color)' }}>
          {userEmail.includes('tranghoang') && (
            <button 
              className="btn glass-panel" 
              onClick={() => setShowBackupModal(true)}
              style={{ width: '100%', color: 'var(--text-main)', display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}
            >
              <span>📥</span> Backup Data
            </button>
          )}

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
              style={{ padding: '10px 14px', fontSize: '1.4rem', color: 'var(--text-main)' }}
              title="Toggle Theme"
            >
              {theme === 'dark' ? '☀️' : theme === 'light' ? '🌸' : '🌙'}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Notifications Dropdown */}
              <div style={{ position: 'relative' }}>
                <div 
                  style={{ width: '44px', height: '44px', fontSize: '1.2rem', borderRadius: '50%', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', position: 'relative' }}
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: 'var(--danger)', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                      {unreadCount}
                    </span>
                  )}
                </div>

                {showNotifications && (
                  <div className="glass-panel" style={{ position: 'absolute', top: '48px', right: '0', width: '320px', maxHeight: '400px', overflowY: 'auto', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0 }}>Notifications</h4>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.8rem', cursor: 'pointer' }}>Mark all read</button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => !n.is_read && markAsRead(n.id)}
                          style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', backgroundColor: n.is_read ? 'transparent' : 'rgba(94, 106, 210, 0.05)', cursor: n.is_read ? 'default' : 'pointer', transition: 'background-color 0.2s' }}
                        >
                          <p style={{ margin: 0, fontSize: '0.85rem', color: n.is_read ? 'var(--text-secondary)' : 'var(--text-main)' }}>{n.content}</p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              
              <div style={{ width: '44px', height: '44px', fontSize: '1.2rem', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold' }}>
                {session.user.email.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic View Content */}
        <div className="content-area" style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px 32px' }}>
          {activeTab === 'DASHBOARD' && <Dashboard session={session} isAdmin={isAdmin} />}
          {activeTab === 'TASK_BOARD' && <TaskBoard session={session} isAdmin={isAdmin} />}
          {activeTab === 'TASK_LIST' && <TaskList session={session} isAdmin={isAdmin} />}
          {activeTab === 'ACTIVITY' && <ActivityFeed />}
        </div>
        
        {showBackupModal && <BackupModal onClose={() => setShowBackupModal(false)} />}
      </div>
    </div>
  );
}

export default App;
