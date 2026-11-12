'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell
} from 'recharts';
import Sidebar from '../../../components/Sidebar';
import AttendanceRing from '../../../components/AttendanceRing';
import { useAuth } from '../../../context/AuthContext';
import { getStudentDashboard } from '../../../lib/api';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background: '#1a1a2e', border: '1px solid rgba(139,92,246,0.3)',
        borderRadius: 10, padding: '10px 14px'
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, fontSize: 14, fontWeight: 600 }}>
            {p.name}: {p.value}{p.name === 'Attendance' ? '%' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user?.role !== 'student') router.push('/teacher/dashboard');
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.role === 'student') {
      getStudentDashboard()
        .then(res => setData(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (authLoading || loading) return <LoadingSkeleton />;
  if (!data) return null;

  const { student, summary, subjects } = data;
  const chartData = subjects.map(s => ({
    name: s.subject.code,
    Attended: s.attended,
    Total: s.totalClasses,
    Attendance: s.percentage,
    color: s.subject.color
  }));

  const radarData = subjects.map(s => ({
    subject: s.subject.code,
    value: s.percentage,
    fullMark: 100
  }));

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        {/* Header */}
        <div className="animate-fade-up" style={{ marginBottom: 22 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800,
            letterSpacing: '-0.02em', marginBottom: 6
          }}>
            Good {getGreeting()}, <span className="gradient-text">{student.name.split(' ')[0]}</span> 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {student.rollNumber} · {student.department} · Sem {student.semester}
          </p>
        </div>

        {/* Mobile Quick Scan Hero Banner */}
        <div
          onClick={() => router.push('/qr-scanner')}
          className="mobile-scan-hero animate-fade-up"
          style={{
            marginBottom: 20,
            padding: '16px 18px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(20, 184, 166, 0.18) 100%)',
            border: '1px solid rgba(167, 139, 250, 0.35)',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(124, 58, 237, 0.18)'
          }}
        >
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
              In class right now?
            </p>
            <p style={{ fontSize: 12, color: '#cbd5e1' }}>
              Tap to scan your teacher&apos;s QR code
            </p>
          </div>
          <div style={{
            padding: '10px 16px',
            borderRadius: 12,
            background: '#7c3aed',
            color: 'white',
            fontWeight: 700,
            fontSize: 13,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)'
          }}>
            Scan QR →
          </div>
        </div>

        {/* Summary stats */}
        <div className="stats-grid animate-fade-up stagger-1">
          <StatCard
            label="Overall Rate"
            value={`${summary.overallPercentage}%`}
            icon="📊"
            color={summary.overallPercentage >= 75 ? '#10b981' : '#f43f5e'}
            sub={summary.overallPercentage >= 75 ? '✓ Above 75%' : '⚠ Below 75%'}
          />
          <StatCard label="Subjects" value={summary.totalSubjects} icon="📚" color="#7c3aed" sub="Enrolled" />
          <StatCard label="Attended" value={summary.totalAttended} icon="✅" color="#14b8a6" sub={`of ${summary.totalClasses} classes`} />
          <StatCard
            label="At Risk"
            value={summary.subjectsBelowThreshold}
            icon="⚠️"
            color={summary.subjectsBelowThreshold > 0 ? '#f43f5e' : '#10b981'}
            sub={summary.subjectsBelowThreshold > 0 ? 'Need attention' : 'All safe!'}
          />
        </div>

        {/* Charts Split Grid */}
        <div className="dashboard-split-grid">
          <div className="glass-card animate-fade-up stagger-2" style={{
            padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700,
              marginBottom: 4, textAlign: 'center'
            }}>Overall Standing</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
              Across all {summary.totalSubjects} subjects
            </p>
            <AttendanceRing percentage={summary.overallPercentage} size={150} strokeWidth={13} />
            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                {summary.totalAttended} of {summary.totalClasses} classes attended
              </p>
              {summary.overallPercentage < 75 && (
                <div style={{
                  marginTop: 10, padding: '8px 14px',
                  background: 'rgba(244,63,94,0.1)', borderRadius: 8,
                  border: '1px solid rgba(244,63,94,0.2)'
                }}>
                  <p style={{ color: '#fda4af', fontSize: 12, fontWeight: 600 }}>
                    ⚠ Below 75% minimum cutoff
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card animate-fade-up stagger-2" style={{ padding: 20 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 4
            }}>Attendance by Subject</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Classes attended vs total</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Total" fill="rgba(255,255,255,0.06)" radius={[4,4,0,0]} />
                <Bar dataKey="Attended" radius={[4,4,0,0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color || '#7c3aed'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subject cards */}
        <div className="animate-fade-up stagger-3" style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 14
          }}>Subject Breakdown</h2>
          <div className="subjects-grid">
            {subjects.map((s, i) => (
              <SubjectCard key={s.subject._id} subject={s} delay={i} />
            ))}
          </div>
        </div>

        {/* Radar chart */}
        {subjects.length > 2 && (
          <div className="glass-card animate-fade-up stagger-4" style={{ padding: 20 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 4
            }}>Attendance Radar</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Performance across all subjects
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.07)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Radar name="Attendance" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.18} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </main>
    </div>
  );
}

function SubjectCard({ subject: s }) {
  const pct = s.percentage;
  const subColor = s.subject.color || '#7c3aed';

  return (
    <div className="glass-card glass-card-hover" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: subColor, flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
              {s.subject.code}
            </span>
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, color: 'var(--text-primary)' }}>
            {s.subject.name}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {s.subject.teacher?.name}
          </p>
        </div>
        <div style={{ flexShrink: 0 }}>
          <AttendanceRing percentage={pct} size={64} strokeWidth={6} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: 13 }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>ATTENDED</p>
          <p style={{ fontWeight: 700, color: '#10b981' }}>{s.attended}</p>
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>ABSENT</p>
          <p style={{ fontWeight: 700, color: '#f43f5e' }}>{s.absent}</p>
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 2 }}>TOTAL</p>
          <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{s.totalClasses}</p>
        </div>
      </div>

      <div className="progress-bar" style={{ marginBottom: 10 }}>
        <div className="progress-fill" style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${subColor}80, ${subColor})`
        }} />
      </div>

      {s.isBelowThreshold ? (
        <div style={{
          padding: '8px 12px', background: 'rgba(244,63,94,0.08)',
          border: '1px solid rgba(244,63,94,0.2)', borderRadius: 8
        }}>
          <p style={{ color: '#fda4af', fontSize: 12, fontWeight: 600 }}>
            ⚠ Need {s.classesNeeded} more class{s.classesNeeded !== 1 ? 'es' : ''} to reach 75%
          </p>
        </div>
      ) : (
        <div style={{
          padding: '8px 12px', background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8
        }}>
          <p style={{ color: '#6ee7b7', fontSize: 12, fontWeight: 600 }}>
            ✓ Above attendance threshold
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, sub }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{
          fontSize: 22, fontFamily: 'var(--font-display)', fontWeight: 800, color
        }}>{value}</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className="skeleton" style={{ height: 36, width: 220, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 18, width: 180, marginBottom: 24 }} />
        <div className="stats-grid">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 95 }} />)}
        </div>
        <div className="skeleton" style={{ height: 260 }} />
      </main>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
