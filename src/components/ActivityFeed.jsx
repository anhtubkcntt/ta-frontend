import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ActivityFeed() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Fetch logs and join with profiles to get user email
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id,
          created_at,
          action_type,
          entity,
          details,
          profiles:user_id (email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching activity logs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="glass-panel" style={{ padding: '24px' }}>Loading activities...</div>;
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', minHeight: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>System Activity Logs</h2>
        <button className="btn" onClick={fetchLogs} style={{ backgroundColor: 'var(--surface-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
          🔄 Refresh
        </button>
      </div>
      
      {logs.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No recent activities found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {logs.map(log => {
            const date = new Date(log.created_at);
            const userEmail = log.profiles?.email || 'Unknown User';
            const username = userEmail.split('@')[0];
            
            let badgeColor = 'var(--text-secondary)';
            let badgeBg = 'rgba(148, 163, 184, 0.1)';
            if (log.action_type === 'CREATE') {
              badgeColor = 'var(--success)';
              badgeBg = 'rgba(16, 185, 129, 0.1)';
            } else if (log.action_type === 'UPDATE') {
              badgeColor = 'var(--warning)';
              badgeBg = 'rgba(245, 158, 11, 0.1)';
            } else if (log.action_type === 'DELETE') {
              badgeColor = 'var(--danger)';
              badgeBg = 'rgba(239, 68, 68, 0.1)';
            }
            
            return (
              <div key={log.id} style={{ display: 'flex', gap: '16px', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #8b5cf6)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontWeight: 'bold', flexShrink: 0 }}>
                  {username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{username}</span>
                      <span className="badge" style={{ color: badgeColor, backgroundColor: badgeBg, borderColor: badgeColor, padding: '2px 8px', fontSize: '0.7rem' }}>
                        {log.action_type}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {date.toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>{log.details}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
