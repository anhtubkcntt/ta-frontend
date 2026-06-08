import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import TaskDetail from './TaskDetail';
import TaskForm from './TaskForm';
import { logActivity } from '../utils/logger';

export default function TaskBoard({ session, isAdmin }) {
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filter, setFilter] = useState('ALL'); // Category
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (tasksError) throw tasksError;
      
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
      console.error('Error fetching tasks:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (task, newStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);
        
      if (error) throw error;
      
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await logActivity(
          userData.user.id,
          'UPDATE',
          'TASK',
          `Moved task "${task.name}" to ${newStatus.replace('_', ' ')}`
        );
      }
      
      fetchData();
    } catch (error) {
      alert('Error updating status: ' + error.message);
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
    return (
      <TaskDetail 
        task={selectedTask} 
        onBack={() => {setSelectedTask(null); fetchData();}} 
        session={session} 
        isAdmin={isAdmin}
      />
    );
  }

  const columns = [
    { id: 'PENDING', title: 'Pending', color: 'var(--text-secondary)' },
    { id: 'NOT_STARTED', title: 'Not Started', color: '#94a3b8' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'var(--warning)' },
    { id: 'DONE', title: 'Done', color: 'var(--success)' }
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px', minHeight: '600px', position: 'relative' }}>
      {showTaskForm && (
        <TaskForm 
          onClose={() => setShowTaskForm(false)} 
          onSuccess={() => { setShowTaskForm(false); fetchData(); }} 
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2>Task Board (Kanban)</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowTaskForm(true)}>
              + Create Task
            </button>
          )}

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
        </div>
      </div>

      {loading ? (
        <p>Loading board...</p>
      ) : (
        <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '16px' }}>
          {columns.map(col => (
            <div key={col.id} style={{ flex: 1, minWidth: '300px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: `2px solid ${col.color}`, paddingBottom: '8px' }}>
                <h3 style={{ fontSize: '1.1rem' }}>{col.title}</h3>
                <span className="badge" style={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)' }}>
                  {filteredTasks.filter(t => t.status === col.id).length}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '200px' }}>
                {filteredTasks.filter(t => t.status === col.id).map(task => (
                  <div 
                    key={task.id} 
                    className="glass-panel" 
                    style={{ padding: '16px', cursor: 'pointer', transition: 'transform 0.2s', backgroundColor: 'var(--surface-color)' }}
                    onClick={() => setSelectedTask(task)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span className="badge" style={{ color: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}>
                        {task.category}
                      </span>
                      {/* Action buttons to change status */}
                      <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                        {(() => {
                          const order = ['PENDING', 'NOT_STARTED', 'IN_PROGRESS', 'DONE'];
                          const idx = order.indexOf(col.id);
                          const prev = idx > 0 ? order[idx - 1] : null;
                          const next = idx < order.length - 1 ? order[idx + 1] : null;
                          return (
                            <>
                              {prev && <button onClick={() => updateTaskStatus(task, prev)} title={`Move to ${prev.replace('_',' ')}`} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px' }}>&larr;</button>}
                              {next && <button onClick={() => updateTaskStatus(task, next)} title={`Move to ${next.replace('_',' ')}`} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px' }}>&rarr;</button>}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    
                    <h4 style={{ fontSize: '1rem', marginBottom: '8px', lineHeight: '1.4' }}>{task.name}</h4>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {task.pic_ids && task.pic_ids.length > 0 ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {task.pic_ids.map(id => profiles[id]?.email.split('@')[0]).filter(Boolean).join(', ')}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Unassigned</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: task.deadline ? 'var(--danger)' : 'var(--text-secondary)' }}>
                        {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No date'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
