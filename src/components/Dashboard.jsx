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
    assignees: {},
    total: 0
  });

  const [reportsData, setReportsData] = useState([]);
  const [taskMap, setTaskMap] = useState({});
  const [profileMap, setProfileMap] = useState({});
  const [selectedMetricDetail, setSelectedMetricDetail] = useState(null);

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

      const { data: profilesData } = await supabase.from('profiles').select('*');
      let pMap = {};
      if (profilesData) {
        profilesData.forEach(p => {
          pMap[p.id] = p;
        });
        setProfileMap(pMap);
      }

      const tStats = {
        categories: { RECRUITMENT: 0, EB: 0, OTHER: 0 },
        statuses: { NOT_STARTED: 0, PENDING: 0, IN_PROGRESS: 0, DONE: 0 },
        assignees: {},
        supporters: {},
        total: tasksData ? tasksData.length : 0
      };

      let tMap = {};
      if (tasksData) {
        tasksData.forEach(t => {
          tMap[t.id] = t;
          if (tStats.categories[t.category] !== undefined) tStats.categories[t.category]++;
          if (tStats.statuses[t.status] !== undefined) tStats.statuses[t.status]++;
          
          if (t.pic_ids && t.pic_ids.length > 0) {
            t.pic_ids.forEach(picId => {
              const profile = pMap[picId];
              if (profile) {
                const username = profile.email.split('@')[0];
                tStats.assignees[username] = (tStats.assignees[username] || 0) + 1;
              }
            });
          } else {
            tStats.assignees['Unassigned'] = (tStats.assignees['Unassigned'] || 0) + 1;
          }
          
          if (t.supporter_ids && t.supporter_ids.length > 0) {
            t.supporter_ids.forEach(suppId => {
              const profile = pMap[suppId];
              if (profile) {
                const username = profile.email.split('@')[0];
                tStats.supporters[username] = (tStats.supporters[username] || 0) + 1;
              }
            });
          } else {
            tStats.supporters['No Supporters'] = (tStats.supporters['No Supporters'] || 0) + 1;
          }
        });
        setTaskMap(tMap);
      }
      setTaskMetrics(tStats);

      const totals = {
        cv_received: 0, cv_pass_screening: 0, cv_interview_nsc: 0,
        cv_interview_client: 0, offers: 0, onboardings: 0, pass_probations: 0
      };

      if (data) {
        setReportsData(data);
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
    { key: 'cv_received', title: 'Total CVs', value: metrics.cv_received, color: 'var(--primary-color)' },
    { key: 'cv_pass_screening', title: 'Pass Screen', value: metrics.cv_pass_screening, color: '#3b82f6' },
    { key: 'cv_interview_nsc', title: 'Int. NSC', value: metrics.cv_interview_nsc, color: '#8b5cf6' },
    { key: 'cv_interview_client', title: 'Int. Client', value: metrics.cv_interview_client, color: '#d946ef' },
    { key: 'offers', title: 'Offers', value: metrics.offers, color: 'var(--success)' },
    { key: 'onboardings', title: 'Onboardings', value: metrics.onboardings, color: '#10b981' },
    { key: 'pass_probations', title: 'Pass Probation', value: metrics.pass_probations, color: '#059669' }
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

            {/* Assignee Stats */}
            <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'var(--surface-color)' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                Tasks by PIC
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                {Object.entries(taskMetrics.assignees)
                  .sort(([nameA, countA], [nameB, countB]) => {
                    if (nameA.toLowerCase().includes('tranghoang')) return -1;
                    if (nameB.toLowerCase().includes('tranghoang')) return 1;
                    return countB - countA;
                  })
                  .map(([username, count]) => (
                  <div key={username} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{username}</span>
                    <span className="badge" style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '4px 12px' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Supporter Stats */}
            <div className="glass-panel" style={{ padding: '24px', backgroundColor: 'var(--surface-color)' }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                Tasks by Supporter
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                {Object.entries(taskMetrics.supporters)
                  .sort(([nameA, countA], [nameB, countB]) => {
                    if (nameA.toLowerCase().includes('tranghoang')) return -1;
                    if (nameB.toLowerCase().includes('tranghoang')) return 1;
                    return countB - countA;
                  })
                  .map(([username, count]) => (
                  <div key={username} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{username}</span>
                    <span className="badge" style={{ backgroundColor: '#8b5cf6', color: 'white', padding: '4px 12px' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <h3 style={{ marginBottom: '24px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>Recruitment Metrics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
            {statCards.map((stat, idx) => (
              <div 
                key={idx} 
                className="glass-panel" 
                style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderTop: `4px solid ${stat.color}`, cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => setSelectedMetricDetail(stat)}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
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
          
          {selectedMetricDetail && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedMetricDetail(null)}>
              <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', padding: '32px', position: 'relative', backgroundColor: 'var(--bg-color)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: `2px solid ${selectedMetricDetail.color}`, paddingBottom: '16px' }}>
                  <h3 style={{ color: selectedMetricDetail.color, fontSize: '1.4rem' }}>Detail: {selectedMetricDetail.title}</h3>
                  <button onClick={() => setSelectedMetricDetail(null)} style={{ background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--surface-color)' }}>&times;</button>
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '12px 8px' }}>PIC</th>
                      <th style={{ padding: '12px 8px' }}>Task Name</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const aggregated = {};
                      reportsData.forEach(report => {
                        const val = parseInt(report[selectedMetricDetail.key] || 0);
                        if (val > 0) {
                          const key = `${report.user_id}_${report.task_id}`;
                          if (!aggregated[key]) {
                            aggregated[key] = {
                              userId: report.user_id,
                              taskId: report.task_id,
                              count: 0
                            };
                          }
                          aggregated[key].count += val;
                        }
                      });
                      const items = Object.values(aggregated).sort((a, b) => b.count - a.count);
                      
                      if (items.length === 0) {
                        return <tr><td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No data available for this metric.</td></tr>;
                      }
                      
                      return items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '16px 8px', fontWeight: 'bold' }}>{profileMap[item.userId] ? profileMap[item.userId].email.split('@')[0] : 'Unknown'}</td>
                          <td style={{ padding: '16px 8px', color: 'var(--text-main)' }}>{taskMap[item.taskId] ? taskMap[item.taskId].name : 'Deleted Task'}</td>
                          <td style={{ padding: '16px 8px', textAlign: 'right', color: selectedMetricDetail.color, fontWeight: 'bold', fontSize: '1.1rem' }}>{item.count}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
