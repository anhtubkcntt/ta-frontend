import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const [tasks, setTasks] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Tasks
      const { data: tasksData, error: tasksError } = await supabase.from('tasks').select('*');
      if (tasksError) throw tasksError;

      // Fetch Profiles
      const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('*');
      if (!profilesError && profilesData) {
        const profileMap = {};
        profilesData.forEach(p => {
          profileMap[p.id] = p;
        });
        setProfiles(profileMap);
      }

      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error fetching data for reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare data for Bar Chart (Tasks by User and Status)
  const processBarChartData = () => {
    const userMap = {};

    tasks.forEach(task => {
      const userEmail = profiles[task.pic_id] ? profiles[task.pic_id].email.split('@')[0] : 'Unassigned';
      
      if (!userMap[userEmail]) {
        userMap[userEmail] = { name: userEmail, PENDING: 0, IN_PROGRESS: 0, DONE: 0 };
      }
      
      if (task.status === 'PENDING') userMap[userEmail].PENDING += 1;
      else if (task.status === 'IN_PROGRESS') userMap[userEmail].IN_PROGRESS += 1;
      else if (task.status === 'DONE') userMap[userEmail].DONE += 1;
    });

    return Object.values(userMap);
  };

  // Prepare data for Pie Chart (Tasks by Category)
  const processPieChartData = () => {
    const catMap = { 'RECRUITMENT': 0, 'EB': 0, 'OTHER': 0 };
    tasks.forEach(task => {
      if (catMap[task.category] !== undefined) {
        catMap[task.category] += 1;
      }
    });

    return [
      { name: 'Recruitment', value: catMap['RECRUITMENT'] },
      { name: 'Employer Branding', value: catMap['EB'] },
      { name: 'Other', value: catMap['OTHER'] }
    ].filter(item => item.value > 0);
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading reports...</div>;
  }

  const barData = processBarChartData();
  const pieData = processPieChartData();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel" style={{ padding: '12px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(15, 23, 42, 0.95)' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, fontSize: '0.9rem' }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', minHeight: '600px' }}>
      <h2 style={{ marginBottom: '8px' }}>Detailed Reports</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Visual overview of team performance and task distribution.</p>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <p>Not enough data to generate reports. Please create some tasks first.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          
          {/* Bar Chart Section */}
          <div className="glass-panel" style={{ padding: '24px', height: '400px' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', textAlign: 'center' }}>Task Distribution by Assignee</h3>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart
                data={barData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="PENDING" name="Pending" stackId="a" fill="var(--text-secondary)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="IN_PROGRESS" name="In Progress" stackId="a" fill="var(--warning)" />
                <Bar dataKey="DONE" name="Done" stackId="a" fill="var(--success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart Section */}
          <div className="glass-panel" style={{ padding: '24px', height: '400px' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '1.2rem', textAlign: 'center' }}>Tasks by Category</h3>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'white' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}
    </div>
  );
}
