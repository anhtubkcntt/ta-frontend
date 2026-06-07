import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Dashboard({ session }) {
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('ALL_TIME');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [metrics, setMetrics] = useState({
    cv_received: 0,
    cv_pass_screening: 0,
    cv_interview_nsc: 0,
    cv_interview_client: 0,
    offers: 0,
    onboardings: 0,
    pass_probations: 0
  });

  const [taskMetrics, setTaskMetrics] = useState({
    categories: { RECRUITMENT: 0, EB: 0, OTHER: 0 },
    statuses: { NOT_STARTED: 0, PENDING: 0, IN_PROGRESS: 0, DONE: 0 },
    total: 0
  });

  useEffect(() => {
    fetchMetrics();
  }, [timeFilter, customStart, customEnd]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      let query = supabase.from('daily_reports').select('*');
      
      const today = new Date();
      
      const formatDate = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      if (timeFilter === 'TODAY') {
        query = query.gte('report_date', formatDate(today));
      } else if (timeFilter === 'THIS_WEEK') {
        const dayOfWeek = today.getDay(); // 0 is Sunday
        const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
        query = query.gte('report_date', formatDate(monday));
      } else if (timeFilter === 'THIS_MONTH') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        query = query.gte('report_date', formatDate(firstDay));
      } else if (timeFilter === 'CUSTOM') {
        if (customStart) query = query.gte('report_date', customStart);
        if (customEnd) query = query.lte('report_date', customEnd);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let taskQuery = supabase.from('tasks').select('*');
      if (timeFilter === 'TODAY') {
        taskQuery = taskQuery.gte('created_at', formatDate(today));
      } else if (timeFilter === 'THIS_WEEK') {
        const dayOfWeek = today.getDay(); // 0 is Sunday
        const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
        taskQuery = taskQuery.gte('created_at', formatDate(monday));
      } else if (timeFilter === 'THIS_MONTH') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        taskQuery = taskQuery.gte('created_at', formatDate(firstDay));
      } else if (timeFilter === 'CUSTOM') {
        if (customStart) taskQuery = taskQuery.gte('created_at', customStart);
        if (customEnd) taskQuery = taskQuery.lte('created_at', customEnd + 'T23:59:59.999Z');
      }

      const { data: tasksData, error: tasksError } = await taskQuery;
      if (tasksError) throw tasksError;

      const tStats = {
        categories: { RECRUITMENT: 0, EB: 0, OTHER: 0 },
        statuses: { NOT_STARTED: 0, PENDING: 0, IN_PROGRESS: 0, DONE: 0 },
        total: tasksData ? tasksData.length : 0
      };

      if (tasksData) {
        tasksData.forEach(t => {
          if (tStats.categories[t.category] !== undefined) tStats.categories[t.category]++;
          if (tStats.statuses[t.status] !== undefined) tStats.statuses[t.status]++;
        });
      }
      setTaskMetrics(tStats);

      const totals = {
        cv_received: 0, cv_pass_screening: 0, cv_interview_nsc: 0,
        cv_interview_client: 0, offers: 0, onboardings: 0, pass_probations: 0
      };

      if (data) {
        data.forEach(report => {
          totals.cv_received += parseInt(report.cv_received || 0);
          totals.cv_pass_screening += parseInt(report.cv_pass_screening || 0);
          totals.cv_interview_nsc += parseInt(report.cv_interview_nsc || 0);
          totals.cv_interview_client += parseInt(report.cv_interview_client || 0);
          totals.offers += parseInt(report.offers || 0);
          totals.onboardings += parseInt(report.onboardings || 0);
          totals.pass_probations += parseInt(report.pass_probations || 0);
        });
      }

      setMetrics(totals);
    } catch (err) {
      console.error('Error fetching metrics', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total CVs', value: metrics.cv_received, color: 'var(--primary-color)' },
    { title: 'Pass Screen', value: metrics.cv_pass_screening, color: '#3b82f6' },
    { title: 'Int. NSC', value: metrics.cv_interview_nsc, color: '#8b5cf6' },
    { title: 'Int. Client', value: metrics.cv_interview_client, color: '#d946ef' },
    { title: 'Offers', value: metrics.offers, color: 'var(--success)' },
    { title: 'Onboardings', value: metrics.onboardings, color: '#10b981' },
    { title: 'Pass Probation', value: metrics.pass_probations, color: '#059669' }
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px', minHeight: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <h2>Recruitment Dashboard</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Filter Time:</span>
            <select 
              className="btn glass-panel" 
              style={{ color: 'var(--text-main)' }}
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="ALL_TIME">All Time</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="CUSTOM">Custom Date Range</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Loading metrics...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            {/* Category Stats */}
            <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'var(--surface-color)' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                Tasks by Category (Total: {taskMetrics.total})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Recruitment</span><span className="badge" style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '4px 12px' }}>{taskMetrics.categories.RECRUITMENT}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Employer Branding</span><span className="badge" style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '4px 12px' }}>{taskMetrics.categories.EB}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Other</span><span className="badge" style={{ backgroundColor: '#64748b', color: 'white', padding: '4px 12px' }}>{taskMetrics.categories.OTHER}</span>
                </div>
              </div>
            </div>

            {/* Status Stats */}
            <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'var(--surface-color)' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                Tasks by Status
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Pending</span><span className="badge" style={{ backgroundColor: '#64748b', color: 'white', padding: '4px 12px' }}>{taskMetrics.statuses.PENDING}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Not Started</span><span className="badge" style={{ backgroundColor: '#94a3b8', color: 'white', padding: '4px 12px' }}>{taskMetrics.statuses.NOT_STARTED}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>In Progress</span><span className="badge" style={{ backgroundColor: 'var(--warning)', color: 'white', padding: '4px 12px' }}>{taskMetrics.statuses.IN_PROGRESS}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Done</span><span className="badge" style={{ backgroundColor: 'var(--success)', color: 'white', padding: '4px 12px' }}>{taskMetrics.statuses.DONE}</span>
                </div>
              </div>
            </div>
          </div>
          
          <h3 style={{ marginBottom: '24px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Recruitment Metrics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
            {statCards.map((stat, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderTop: `4px solid ${stat.color}` }}>
                <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px', textAlign: 'center' }}>{stat.title}</h3>
                <p style={{ fontSize: '2.5rem', fontWeight: 'bold', color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '48px', padding: '32px', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '32px', textAlign: 'center', color: 'var(--text-main)' }}>Recruitment Funnel</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              {statCards.map((stat, idx) => {
                const maxVal = Math.max(metrics.cv_received, 1);
                const percentage = Math.max((stat.value / maxVal) * 100, 5); 
                
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '700px' }}>
                    <div style={{ width: '160px', textAlign: 'right', paddingRight: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {stat.title}
                    </div>
                    <div style={{ flex: 1, backgroundColor: 'var(--bg-color)', height: '40px', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <div style={{ 
                        width: `${percentage}%`, 
                        height: '100%', 
                        backgroundColor: stat.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '16px',
                        fontWeight: 'bold',
                        color: 'white',
                        fontSize: '0.95rem',
                        transition: 'width 0.5s ease'
                      }}>
                        {stat.value > 0 ? stat.value : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
