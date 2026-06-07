import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function TaskDetail({ task, onBack, session }) {
  const [currentTask, setCurrentTask] = useState(task);
  const [metrics, setMetrics] = useState(null);
  const [reports, setReports] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Daily report form states
  const [approached, setApproached] = useState(0);
  const [called, setCalled] = useState(0);
  const [cvReceived, setCvReceived] = useState(0);
  const [cvPassScreening, setCvPassScreening] = useState(0);
  const [cvInterviewNsc, setCvInterviewNsc] = useState(0);
  const [cvInterviewClient, setCvInterviewClient] = useState(0);
  const [offers, setOffers] = useState(0);
  const [onboardings, setOnboardings] = useState(0);
  const [passProbations, setPassProbations] = useState(0);
  
  const [reportNotes, setReportNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTaskDetails();
  }, [task.id]);

  const fetchTaskDetails = async () => {
    setLoading(true);
    try {
      // Fetch profiles for the assignee dropdown
      const { data: profilesData } = await supabase.from('profiles').select('*');
      setProfiles(profilesData || []);

      // If recruitment task, fetch metrics
      if (currentTask.category === 'RECRUITMENT') {
        const { data: metricsData } = await supabase
          .from('task_recruitment_metrics')
          .select('*')
          .eq('task_id', currentTask.id)
          .single();
        setMetrics(metricsData);
      }

      // Fetch daily reports
      const { data: reportsData } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('task_id', currentTask.id)
        .order('report_date', { ascending: false });
      
      setReports(reportsData || []);
    } catch (error) {
      console.error('Error fetching task details:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePicToggle = async (id) => {
    const currentPics = currentTask.pic_ids || [];
    const newPicIds = currentPics.includes(id) 
      ? currentPics.filter(p => p !== id) 
      : [...currentPics, id];
    
    try {
      const { error } = await supabase.from('tasks').update({ pic_ids: newPicIds }).eq('id', currentTask.id);
      if (error) throw error;
      setCurrentTask({ ...currentTask, pic_ids: newPicIds });
    } catch (err) { alert(err.message); }
  };

  const handleSupporterToggle = async (id) => {
    const currentSupps = currentTask.supporter_ids || [];
    const newSuppIds = currentSupps.includes(id) 
      ? currentSupps.filter(p => p !== id) 
      : [...currentSupps, id];
    
    try {
      const { error } = await supabase.from('tasks').update({ supporter_ids: newSuppIds }).eq('id', currentTask.id);
      if (error) throw error;
      setCurrentTask({ ...currentTask, supporter_ids: newSuppIds });
    } catch (err) { alert(err.message); }
  };

  const submitDailyReport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newReport = {
        task_id: currentTask.id,
        user_id: session.user.id,
        approached_candidates: approached,
        called_candidates: called,
        cv_received: cvReceived,
        cv_pass_screening: cvPassScreening,
        cv_interview_nsc: cvInterviewNsc,
        cv_interview_client: cvInterviewClient,
        offers: offers,
        onboardings: onboardings,
        pass_probations: passProbations,
        notes: reportNotes
      };

      const { error } = await supabase
        .from('daily_reports')
        .insert([newReport]);

      if (error) throw error;

      // Update total metrics if recruitment task
      if (currentTask.category === 'RECRUITMENT' && metrics) {
        await supabase
          .from('task_recruitment_metrics')
          .update({
             total_cv_received: (metrics.total_cv_received || 0) + parseInt(cvReceived),
             screened_cv: (metrics.screened_cv || 0) + parseInt(cvPassScreening),
             offers: (metrics.offers || 0) + parseInt(offers)
          })
          .eq('task_id', currentTask.id);
      }

      // Reset form and refresh
      setApproached(0); setCalled(0); setCvReceived(0);
      setCvPassScreening(0); setCvInterviewNsc(0); setCvInterviewClient(0);
      setOffers(0); setOnboardings(0); setPassProbations(0);
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
      <button onClick={onBack} className="btn" style={{ marginBottom: '20px', backgroundColor: 'var(--surface-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
        &larr; Back to Tasks
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="badge" style={{ color: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}>
            {currentTask.category}
          </span>
          <h2 style={{ marginTop: '12px', fontSize: '2rem' }}>{currentTask.name}</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', whiteSpace: 'pre-wrap' }}>{currentTask.content}</p>
          
          <div style={{ marginTop: '24px', display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>PICs (Phụ trách chính)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {profiles.map(p => (
                  <label key={p.id} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={(currentTask.pic_ids || []).includes(p.id)} 
                      onChange={() => handlePicToggle(p.id)} 
                      style={{ width: 'auto', margin: 0 }}
                    />
                    {p.email.split('@')[0]}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Supporters (Hỗ trợ)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {profiles.map(p => (
                  <label key={p.id} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={(currentTask.supporter_ids || []).includes(p.id)} 
                      onChange={() => handleSupporterToggle(p.id)} 
                      style={{ width: 'auto', margin: 0 }}
                    />
                    {p.email.split('@')[0]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <span className="badge" style={{ 
            padding: '6px 12px',
            backgroundColor: currentTask.status === 'DONE' ? 'rgba(16, 185, 129, 0.1)' : 
                             currentTask.status === 'IN_PROGRESS' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(148, 163, 184, 0.1)',
            color: currentTask.status === 'DONE' ? 'var(--success)' : 
                   currentTask.status === 'IN_PROGRESS' ? 'var(--warning)' : 'var(--text-secondary)',
            borderColor: currentTask.status === 'DONE' ? 'var(--success)' : 
                         currentTask.status === 'IN_PROGRESS' ? 'var(--warning)' : 'var(--border-color)'
        }}>
          {currentTask.status.replace('_', ' ')}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '32px' }}>
        
        {/* Left Column: Form submit */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3>Submit Daily Report</h3>
          <form onSubmit={submitDailyReport} style={{ marginTop: '16px' }}>
            {currentTask.category === 'RECRUITMENT' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '0.8rem' }}>Approached</label>
                  <input type="number" min="0" value={approached} onChange={e => setApproached(e.target.value)} />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '0.8rem' }}>Called</label>
                  <input type="number" min="0" value={called} onChange={e => setCalled(e.target.value)} />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--primary-color)' }}>Total CVs</label>
                  <input type="number" min="0" value={cvReceived} onChange={e => setCvReceived(e.target.value)} />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '0.8rem' }}>CV Pass Screen</label>
                  <input type="number" min="0" value={cvPassScreening} onChange={e => setCvPassScreening(e.target.value)} />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '0.8rem' }}>Int. NSC</label>
                  <input type="number" min="0" value={cvInterviewNsc} onChange={e => setCvInterviewNsc(e.target.value)} />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '0.8rem' }}>Int. Client</label>
                  <input type="number" min="0" value={cvInterviewClient} onChange={e => setCvInterviewClient(e.target.value)} />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Offers</label>
                  <input type="number" min="0" value={offers} onChange={e => setOffers(e.target.value)} />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '0.8rem' }}>Onboarding</label>
                  <input type="number" min="0" value={onboardings} onChange={e => setOnboardings(e.target.value)} />
                </div>
                <div className="input-group" style={{ marginBottom: '0' }}>
                  <label style={{ fontSize: '0.8rem' }}>Pass Probation</label>
                  <input type="number" min="0" value={passProbations} onChange={e => setPassProbations(e.target.value)} />
                </div>
              </div>
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
          {currentTask.category === 'RECRUITMENT' && metrics && (
            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ color: 'var(--primary-color)' }}>Total Overview</h3>
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
                    {currentTask.category === 'RECRUITMENT' && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ backgroundColor: 'var(--surface-color)', padding: '2px 6px', borderRadius: '4px' }}>Appr: {report.approached_candidates || 0}</span>
                        <span style={{ backgroundColor: 'var(--surface-color)', padding: '2px 6px', borderRadius: '4px' }}>Call: {report.called_candidates || 0}</span>
                        <span style={{ backgroundColor: 'var(--surface-color)', padding: '2px 6px', borderRadius: '4px' }}>CVs: {report.cv_received || 0}</span>
                        <span style={{ backgroundColor: 'var(--surface-color)', padding: '2px 6px', borderRadius: '4px' }}>Pass Screen: {report.cv_pass_screening || 0}</span>
                        <span style={{ backgroundColor: 'var(--surface-color)', padding: '2px 6px', borderRadius: '4px' }}>Int NSC: {report.cv_interview_nsc || 0}</span>
                        <span style={{ backgroundColor: 'var(--surface-color)', padding: '2px 6px', borderRadius: '4px' }}>Int Client: {report.cv_interview_client || 0}</span>
                        <span style={{ backgroundColor: 'var(--surface-color)', padding: '2px 6px', borderRadius: '4px', color: 'var(--success)' }}>Offers: {report.offers || 0}</span>
                        <span style={{ backgroundColor: 'var(--surface-color)', padding: '2px 6px', borderRadius: '4px' }}>Onboard: {report.onboardings || 0}</span>
                        <span style={{ backgroundColor: 'var(--surface-color)', padding: '2px 6px', borderRadius: '4px' }}>Pass Prob: {report.pass_probations || 0}</span>
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
