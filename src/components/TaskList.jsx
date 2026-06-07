import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import TaskForm from './TaskForm';
import TaskDetail from './TaskDetail';
import { logActivity } from '../utils/logger';

export default function TaskList({ session }) {
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filter, setFilter] = useState('ALL'); // Category
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (tasksError) throw tasksError;
      
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
        
      if (!profilesError && profilesData) {
        const profileMap = {};
        profilesData.forEach(p => {
          profileMap[p.id] = p;
        });
        setProfiles(profileMap);
      }
      
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (task) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);
        
      if (error) throw error;
      
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await logActivity(
          userData.user.id,
          'DELETE',
          'TASK',
          `Deleted task "${task.name}"`
        );
      }
      
      fetchData();
    } catch (error) {
      alert('Error deleting task: ' + error.message);
    }
  };

  const filterByDate = (dateString, filterType) => {
    if (filterType === 'ALL') return true;
    
    const taskDate = new Date(dateString);
    const today = new Date();
    
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (filterType === 'TODAY') {
      return taskDate >= startOfToday;
    }
    
    if (filterType === 'THIS_WEEK') {
      const dayOfWeek = today.getDay(); // 0 is Sunday
      const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
      return taskDate >= startOfWeek;
    }
    
    if (filterType === 'CUSTOM') {
      let pass = true;
      if (customStart) {
        const start = new Date(customStart);
        if (taskDate < start) pass = false;
      }
      if (customEnd) {
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        if (taskDate > end) pass = false;
      }
      return pass;
    }
    
    return true;
  };

  const filteredTasks = tasks.filter(task => {
    const passCategory = filter === 'ALL' || task.category === filter;
    
    const passAssignee = assigneeFilter === 'ALL' || 
                         (assigneeFilter === 'UNASSIGNED' ? (!task.pic_ids || task.pic_ids.length === 0) : 
                         (task.pic_ids && task.pic_ids.includes(assigneeFilter)));
                         
    const passTime = filterByDate(task.created_at, timeFilter);
    return passCategory && passAssignee && passTime;
  });

  if (selectedTask) {
    return <TaskDetail task={selectedTask} onBack={() => {setSelectedTask(null); fetchData();}} session={session} />;
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', minHeight: '600px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2>Task List (Admin View)</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select 
            className="btn glass-panel" 
            style={{ color: 'var(--text-main)' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            <option value="RECRUITMENT">Recruitment</option>
            <option value="EB">Employer Branding</option>
            <option value="OTHER">Other</option>
          </select>

          <select 
            className="btn glass-panel" 
            style={{ color: 'var(--text-main)' }}
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="ALL">All PICs</option>
            <option value="UNASSIGNED">Unassigned</option>
            {Object.values(profiles).map(p => (
              <option key={p.id} value={p.id}>{p.email.split('@')[0]}</option>
            ))}
          </select>
          
          <select 
            className="btn glass-panel" 
            style={{ color: 'var(--text-main)' }}
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Created Today</option>
            <option value="THIS_WEEK">Created This Week</option>
            <option value="CUSTOM">Custom Range</option>
          </select>

          {timeFilter === 'CUSTOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="date" 
                className="btn glass-panel" 
                style={{ padding: '8px', color: 'var(--text-main)', fontSize: '0.85rem' }} 
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
              />
              <span style={{ color: 'var(--text-secondary)' }}>to</span>
              <input 
                type="date" 
                className="btn glass-panel" 
                style={{ padding: '8px', color: 'var(--text-main)', fontSize: '0.85rem' }} 
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
              />
            </div>
          )}

          <button className="btn btn-primary" onClick={() => setShowTaskForm(true)}>+ New Task</button>
        </div>
      </div>

      {loading ? (
        <p>Loading tasks...</p>
      ) : filteredTasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <p>No tasks found matching your filters.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Category</th>
                <th style={{ padding: '12px' }}>PICs</th>
                <th style={{ padding: '12px' }}>Created At</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{task.name}</td>
                  <td style={{ padding: '12px' }}>
                    <span className="badge" style={{ color: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}>
                      {task.category}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                    {task.pic_ids && task.pic_ids.length > 0 
                      ? task.pic_ids.map(id => profiles[id]?.email.split('@')[0]).filter(Boolean).join(', ') 
                      : 'Unassigned'}
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {new Date(task.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className="badge" style={{ 
                        backgroundColor: task.status === 'DONE' ? 'rgba(16, 185, 129, 0.1)' : 
                                         task.status === 'IN_PROGRESS' ? 'rgba(245, 158, 11, 0.1)' :
                                         task.status === 'PENDING' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
                        color: task.status === 'DONE' ? 'var(--success)' : 
                               task.status === 'IN_PROGRESS' ? 'var(--warning)' : 
                               task.status === 'PENDING' ? 'var(--text-secondary)' : '#64748b'
                    }}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: '8px' }} onClick={() => setSelectedTask(task)}>View</button>
                    <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'var(--danger)', color: 'white', border: 'none' }} onClick={() => handleDelete(task)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showTaskForm && (
        <TaskForm 
          onClose={() => setShowTaskForm(false)} 
          onTaskAdded={fetchData} 
        />
      )}
    </div>
  );
}
