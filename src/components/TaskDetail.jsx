import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function TaskDetail({ task, onBack, session }) {
  const [metrics, setMetrics] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Daily report form states
  const [approached, setApproached] = useState(0);
  const [called, setCalled] = useState(0);
  const [cvReceived, setCvReceived] = useState(0);
  const [reportNotes, setReportNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTaskDetails();
  }, [task.id]);

  const fetchTaskDetails = async () => {
    setLoading(true);
    try {
      // If recruitment task, fetch metrics
      if (task.category === 'RECRUITMENT') {
        const { data: metricsData } = await supabase
          .from('task_recruitment_metrics')
          .select('*')
          .eq('task_id', task.id)
          .single();
        setMetrics(metricsData);
      }

      // Fetch daily reports
      const { data: reportsData } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('task_id', task.id)
        .order('report_date', { ascending: false });
      
      setReports(reportsData || []);
    } catch (error) {
      console.error('Error fetching task details:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitDailyReport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newReport = {
        task_id: task.id,
        user_id: session.user.id,
        approached_candidates: approached,
        called_candidates: called,
        cv_received: cvReceived,
        notes: reportNotes
      };

      const { error } = await supabase
        .from('daily_reports')
        .insert([newReport]);

      if (error) throw error;

      // Update total metrics if recruitment task
      if (task.category === 'RECRUITMENT' && metrics) {
        await supabase
          .from('task_recruitment_metrics')
          .update({
             total_cv_received: (metrics.total_cv_received || 0) + parseInt(cvReceived)
          })
          .eq('task_id', task.id);
      }

      // Reset form and refresh
      setApproached(0);
      setCalled(0);
      setCvReceived(0);
      setReportNotes('');
      fetchTaskDetails();
      
      alert('Report submitted successfully!');
    } catch (error) {
      alert('Error submitting report: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="glass-panel" style={{ padding: '24px' }}>Loading task details...</div>;

  return (
    <div className="glass-panel" style={{ padding: '24px', minHeight: '600px' }}>
      <button onClick={onBack} className="btn" style={{ marginBottom: '20px', backgroundColor: 'var(--border-color)', color: 'white' }}>
        &larr; Back to Tasks
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary-color)', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
            {task.category}
          </span>
          <h2 style={{ marginTop: '12px', fontSize: '2rem' }}>{task.name}</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', whiteSpace: 'pre-wrap' }}>{task.content}</p>
        </div>
        <span style={{ 
            padding: '8px 16px', 
            borderRadius: '20px', 
            fontWeight: 'bold',
            backgroundColor: task.status === 'DONE' ? 'rgba(16, 185, 129, 0.2)' : 
                             task.status === 'IN_PROGRESS' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.2)',
            color: task.status === 'DONE' ? 'var(--success)' : 
                   task.status === 'IN_PROGRESS' ? 'var(--warning)' : 'var(--text-secondary)'
        }}>
          {task.status.replace('_', ' ')}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '32px' }}>
        
        {/* Left Column: Form submit */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3>Submit Daily Report</h3>
          <form onSubmit={submitDailyReport} style={{ marginTop: '16px' }}>
            {task.category === 'RECRUITMENT' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="input-group">
                    <label>Approached Candidates</label>
                    <input type="number" min="0" value={approached} onChange={e => setApproached(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Called Candidates</label>
                    <input type="number" min="0" value={called} onChange={e => setCalled(e.target.value)} />
                  </div>
                </div>
                <div className="input-group">
                  <label>CVs Received</label>
                  <input type="number" min="0" value={cvReceived} onChange={e => setCvReceived(e.target.value)} />
                </div>
              </>
            )}
            
            <div className="input-group">
              <label>Work Notes / Update</label>
              <textarea 
                value={reportNotes} 
                onChange={e => setReportNotes(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', minHeight: '80px' }}
              />
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </div>

        {/* Right Column: History & Metrics */}
        <div>
          {task.category === 'RECRUITMENT' && metrics && (
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--primary-color)' }}>Recruitment Metrics</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total CVs</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{metrics.total_cv_received || 0}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Screened</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{metrics.screened_cv || 0}</p>
                </div>
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Offers</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{metrics.offers || 0}</p>
                </div>
              </div>
            </div>
          )}

          <div className="glass-panel" style={{ padding: '24px', maxHeight: '400px', overflowY: 'auto' }}>
            <h3>Recent Reports</h3>
            {reports.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>No reports submitted yet.</p>
            ) : (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {reports.map(report => (
                  <div key={report.id} style={{ borderLeft: '3px solid var(--primary-color)', paddingLeft: '12px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(report.report_date).toLocaleDateString()}</p>
                    <p style={{ fontSize: '0.95rem', marginTop: '4px' }}>{report.notes}</p>
                    {task.category === 'RECRUITMENT' && (
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>Approached: {report.approached_candidates}</span>
                        <span>Called: {report.called_candidates}</span>
                        <span>CVs: {report.cv_received}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
