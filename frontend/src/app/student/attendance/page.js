'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import { useAuth } from '../../../context/AuthContext';
import { getStudentDashboard, getAttendanceHistory } from '../../../lib/api';

export default function StudentAttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user?.role !== 'student') router.push('/teacher/dashboard');
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.role === 'student') {
      Promise.all([
        getStudentDashboard(),
        getAttendanceHistory()
      ]).then(([dash, hist]) => {
        setDashboard(dash.data);
        setHistory(hist.data.records);
      }).catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const filteredHistory = selectedSubject === 'all'
    ? history
    : history.filter(r => r.subject?._id === selectedSubject);

  if (authLoading || loading) return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className="skeleton" style={{ height: 36, width: 220, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 400 }} />
      </main>
    </div>
  );

  const subjects = dashboard?.subjects || [];

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className="animate-fade-up" style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 5vw, 26px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Attendance History
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Complete record of your class attendance
          </p>
        </div>

        {/* Subject filter */}
        <div className="animate-fade-up stagger-1" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <button
            onClick={() => setSelectedSubject('all')}
            className={selectedSubject === 'all' ? 'btn-primary' : 'btn-ghost'}
            style={{ fontSize: 12, padding: '8px 14px' }}
          >All Subjects</button>
          {subjects.map(s => (
            <button
              key={s.subject._id}
              onClick={() => setSelectedSubject(s.subject._id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 10, border: '1px solid',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                background: selectedSubject === s.subject._id ? `${s.subject.color}20` : 'transparent',
                borderColor: selectedSubject === s.subject._id ? s.subject.color : 'var(--border)',
                color: selectedSubject === s.subject._id ? s.subject.color : 'var(--text-secondary)'
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.subject.color }} />
              {s.subject.code}
            </button>
          ))}
        </div>

        {/* Summary row */}
        {selectedSubject !== 'all' && (() => {
          const subj = subjects.find(s => s.subject._id === selectedSubject);
          if (!subj) return null;
          return (
            <div className="glass-card animate-fade-up stagger-2 subject-summary-banner" style={{
              padding: 18, marginBottom: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: subj.subject.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>{subj.subject.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({subj.subject.code})</span>
              </div>
              <div className="subject-summary-metrics" style={{ display: 'flex', gap: 24, marginLeft: 'auto' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-display)' }}>{subj.attended}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>ATTENDED</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#f43f5e', fontFamily: 'var(--font-display)' }}>{subj.absent}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>ABSENT</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)',
                    color: subj.percentage >= 75 ? '#10b981' : '#f43f5e' }}>{subj.percentage}%</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>RATE</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* History table */}
        <div className="glass-card animate-fade-up stagger-2">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>
                Attendance Records
              </h2>
              <span className="badge badge-violet">{filteredHistory.length} records</span>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-muted)' }}>
                      No attendance records found
                    </td>
                  </tr>
                ) : filteredHistory.map((record, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(record.date).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                      <br />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(record.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>
                        {record.subject?.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: record.subject?.color || '#7c3aed' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                          {record.subject?.code}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${record.status === 'present' ? 'badge-green' : record.status === 'late' ? 'badge-amber' : 'badge-red'}`}>
                        {record.status === 'present' ? '✓ Present' : record.status === 'late' ? '⏱ Late' : '✕ Absent'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
