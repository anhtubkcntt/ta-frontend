import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import TaskDetail from './TaskDetail';

export default function TaskBoard({ session }) {
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);

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

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);
        
      if (error) throw error;
      
      // Update local state
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (error) {
      alert('Error updating status: ' + error.message);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'ALL') return true;
    return task.category === filter;
  });

  if (selectedTask) {
    return <TaskDetail task={selectedTask} onBack={() => {setSelectedTask(null); fetchData();}} session={session} />;
  }

  const columns = [
    { id: 'PENDING', title: 'Pending', color: 'var(--text-secondary)' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'var(--warning)' },
    { id: 'DONE', title: 'Done', color: 'var(--success)' }
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px', minHeight: '600px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Task Board (Kanban)</h2>
        <div>
          <select 
            className="btn glass-panel" 
            style={{ color: 'white', marginRight: '12px' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            <option value="RECRUITMENT">Recruitment</option>
            <option value="EB">Employer Branding</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p>Loading board...</p>
      ) : (
        <div style={{ display: 'flex', gap: '24px', overflowX: 'auto', paddingBottom: '16px' }}>
          {columns.map(col => (
            <div key={col.id} style={{ flex: 1, minWidth: '300px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: `2px solid ${col.color}`, paddingBottom: '8px' }}>
                <h3 style={{ fontSize: '1.1rem' }}>{col.title}</h3>
                <span style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                  {filteredTasks.filter(t => t.status === col.id).length}
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '200px' }}>
                {filteredTasks.filter(t => t.status === col.id).map(task => (
                  <div 
                    key={task.id} 
                    className="glass-panel" 
                    style={{ padding: '16px', cursor: 'pointer', transition: 'transform 0.2s' }}
                    onClick={() => setSelectedTask(task)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--primary-color)', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                        {task.category}
                      </span>
                      {/* Action buttons to change status */}
                      <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                        {col.id !== 'PENDING' && <button onClick={() => updateTaskStatus(task.id, 'PENDING')} title="Move to Pending" style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px' }}>&larr;</button>}
                        {col.id === 'PENDING' && <button onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')} title="Move to In Progress" style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px' }}>&rarr;</button>}
                        {col.id === 'IN_PROGRESS' && <button onClick={() => updateTaskStatus(task.id, 'DONE')} title="Move to Done" style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px' }}>&rarr;</button>}
                      </div>
                    </div>
                    
                    <h4 style={{ fontSize: '1rem', marginBottom: '8px', lineHeight: '1.4' }}>{task.name}</h4>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {profiles[task.pic_id] ? profiles[task.pic_id].email.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} title={profiles[task.pic_id]?.email}>
                          {profiles[task.pic_id] ? profiles[task.pic_id].email.split('@')[0] : 'Unassigned'}
                        </span>
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
