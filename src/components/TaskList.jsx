import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import TaskForm from './TaskForm';
import TaskDetail from './TaskDetail';

export default function TaskList({ session }) {
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
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

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
        
      if (error) throw error;
      fetchData();
    } catch (error) {
      alert('Error deleting task: ' + error.message);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'ALL') return true;
    return task.category === filter;
  });

  if (selectedTask) {
    return <TaskDetail task={selectedTask} onBack={() => {setSelectedTask(null); fetchData();}} session={session} />;
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', minHeight: '600px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Task List (Admin View)</h2>
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
          <button className="btn btn-primary" onClick={() => setShowTaskForm(true)}>+ New Task</button>
        </div>
      </div>

      {loading ? (
        <p>Loading tasks...</p>
      ) : filteredTasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <p>No tasks found. Create a new task to get started!</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Category</th>
                <th style={{ padding: '12px' }}>Assignee</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{task.name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary-color)', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                      {task.category}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                    {profiles[task.pic_id] ? profiles[task.pic_id].email : 'Unassigned'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: task.status === 'DONE' ? 'rgba(16, 185, 129, 0.2)' : 
                                      task.status === 'IN_PROGRESS' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                      color: task.status === 'DONE' ? 'var(--success)' : 
                            task.status === 'IN_PROGRESS' ? 'var(--warning)' : 'var(--text-secondary)'
                    }}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: '8px', background: 'var(--primary-color)', color: 'white' }} onClick={() => setSelectedTask(task)}>View</button>
                    <button className="btn" style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'var(--danger)', color: 'white' }} onClick={() => handleDelete(task.id)}>Delete</button>
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
