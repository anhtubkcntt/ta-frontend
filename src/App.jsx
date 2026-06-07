import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import TaskBoard from './components/TaskBoard';
import TaskList from './components/TaskList';
import Reports from './components/Reports';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lấy session hiện tại
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Lắng nghe thay đổi trạng thái đăng nhập
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="auth-container">Loading...</div>;
  }

  return (
    <div>
      {!session ? <Auth /> : <MainLayout session={session} />}
    </div>
  );
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

// Layout chính chứa Sidebar và thay đổi nội dung (Dashboard/Tasks)
function MainLayout({ session }) {
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h1>TA Manager</h1>
        <ul className="nav-links">
          <li>
            <a href="#" className={activeTab === 'DASHBOARD' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('DASHBOARD'); }}>
              Dashboard
            </a>
          </li>
          <li>
            <a href="#" className={activeTab === 'TASK_LIST' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('TASK_LIST'); }}>
              Task List
            </a>
          </li>
          <li>
            <a href="#" className={activeTab === 'TASK_BOARD' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('TASK_BOARD'); }}>
              Task Board
            </a>
          </li>
          <li>
            <a href="#" className={activeTab === 'REPORTS' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setActiveTab('REPORTS'); }}>
              Reports
            </a>
          </li>
        </ul>
        <div style={{marginTop: 'auto'}}>
          <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{session.user.email}</p>
          <button 
            className="btn" 
            style={{marginTop: '10px', background: 'transparent', color: 'var(--danger)', padding: 0}}
            onClick={() => supabase.auth.signOut()}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {activeTab === 'DASHBOARD' && <DashboardContent />}
        {activeTab === 'TASK_LIST' && <TaskList session={session} />}
        {activeTab === 'TASK_BOARD' && <TaskBoard session={session} />}
        {activeTab === 'REPORTS' && <Reports />}
      </main>
    </div>
  );
}

// Giao diện Dashboard (Lấy data thật)
function DashboardContent() {
  const [stats, setStats] = useState({ totalCVs: 0, activeTasks: 0, offers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // 1. Get active tasks count
      const { data: activeTasksData } = await supabase
        .from('tasks')
        .select('id')
        .neq('status', 'DONE');
      
      // 2. Get recruitment metrics for Total CVs and Offers
      const { data: metricsData } = await supabase
        .from('task_recruitment_metrics')
        .select('total_cv_received, offers');

      let totalCVs = 0;
      let totalOffers = 0;

      if (metricsData) {
        metricsData.forEach(m => {
          totalCVs += (m.total_cv_received || 0);
          totalOffers += (m.offers || 0);
        });
      }

      setStats({
        activeTasks: activeTasksData ? activeTasksData.length : 0,
        totalCVs,
        offers: totalOffers
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading Dashboard...</div>;
  }

  return (
    <>
        <header style={{marginBottom: '32px'}}>
          <h2 style={{fontSize: '2rem'}}>Welcome back!</h2>
          <p style={{color: 'var(--text-secondary)'}}>Here is an overview of the recruitment progress.</p>
        </header>

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px'}}>
           {/* Metric Cards */}
           <div className="glass-panel" style={{padding: '24px'}}>
              <h3 style={{color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500}}>Total CVs</h3>
              <p style={{fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary-color)'}}>{stats.totalCVs}</p>
           </div>
           <div className="glass-panel" style={{padding: '24px'}}>
              <h3 style={{color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500}}>Active Tasks</h3>
              <p style={{fontSize: '2.5rem', fontWeight: 700, color: 'var(--warning)'}}>{stats.activeTasks}</p>
           </div>
           <div className="glass-panel" style={{padding: '24px'}}>
              <h3 style={{color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500}}>Offers Accepted</h3>
              <p style={{fontSize: '2.5rem', fontWeight: 700, color: 'var(--success)'}}>{stats.offers}</p>
           </div>
        </div>

        <div className="glass-panel" style={{padding: '24px', height: '400px'}}>
           <h3>Task Status Distribution</h3>
           <p style={{color: 'var(--text-secondary)', margin: '16px 0'}}>
             Tạo task mới trong tab "Tasks" hoặc cập nhật Daily Report để hệ thống tổng hợp thêm dữ liệu thực tế tại đây nhé!
           </p>
           <div style={{width: '100%', height: '70%', display: 'flex', alignItems: 'flex-end', gap: '20px', marginTop: '20px'}}>
              {/* Fake Bar Chart */}
              <div style={{flex: 1, background: 'var(--primary-color)', height: '10%', borderRadius: '4px 4px 0 0', opacity: stats.activeTasks > 0 ? 0.8 : 0.2}}></div>
              <div style={{flex: 1, background: 'var(--warning)', height: '20%', borderRadius: '4px 4px 0 0', opacity: stats.activeTasks > 0 ? 0.8 : 0.2}}></div>
              <div style={{flex: 1, background: 'var(--success)', height: '15%', borderRadius: '4px 4px 0 0', opacity: stats.activeTasks > 0 ? 0.8 : 0.2}}></div>
           </div>
        </div>
    </>
  );
}

export default App;
