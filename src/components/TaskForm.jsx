import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function TaskForm({ onClose, onTaskAdded }) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('RECRUITMENT');
  const [deadline, setDeadline] = useState('');
  const [picId, setPicId] = useState('');
  const [status, setStatus] = useState('PENDING');
  
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (data) {
        setProfiles(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const newTask = {
        name,
        content,
        category,
        deadline: deadline || null,
        pic_id: picId || userData.user.id,
        status: status
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select();

      if (error) throw error;
      
      // If it's a recruitment task, create the metrics record
      if (category === 'RECRUITMENT' && data && data.length > 0) {
        const { error: metricsError } = await supabase
          .from('task_recruitment_metrics')
          .insert([{ task_id: data[0].id }]);
          
        if (metricsError) throw metricsError;
      }

      onTaskAdded();
      onClose();
    } catch (error) {
      alert('Error creating task: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(15, 23, 42, 0.8)', 
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel" style={{ padding: '32px', width: '100%', maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2>Create New Task</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Task Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tuyển 5 Frontend Dev" />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label>Category</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value)}
                style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
              >
                <option value="RECRUITMENT">Recruitment (Tuyển dụng)</option>
                <option value="EB">Employer Branding</option>
                <option value="OTHER">Other Tasks</option>
              </select>
            </div>
            <div className="input-group">
              <label>Assignee</label>
              <select 
                value={picId} 
                onChange={e => setPicId(e.target.value)}
                style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
              >
                <option value="">-- Chọn người nhận --</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.email}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="input-group">
            <label>Content / Description</label>
            <textarea 
              value={content} 
              onChange={e => setContent(e.target.value)}
              style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', minHeight: '80px' }}
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label>Deadline</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Status</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value)}
                style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button type="button" className="btn" onClick={onClose} style={{ flex: 1, backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'white' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
