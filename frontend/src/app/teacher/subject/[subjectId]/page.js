'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import Sidebar from '../../../../components/Sidebar';
import { useAuth } from '../../../../context/AuthContext';
import {
  getTeacherSubject, generateQR, getActiveSession,
  invalidateSession, getSessionStudents, downloadSubjectCSV
} from '../../../../lib/api';

export default function TeacherSubjectPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { subjectId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [sessionStudents, setSessionStudents] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [qrTab, setQrTab] = useState('qr'); // 'qr' | 'students'
  const [duration, setDuration] = useState(15);

  // Auth Protection
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user?.role !== 'teacher') router.push('/student/dashboard');
  }, [user, authLoading, router]);

  const fetchData = useCallback(() => {
    if (!user || !subjectId) return;
    Promise.all([
      getTeacherSubject(subjectId),
      getActiveSession(subjectId)
    ]).then(([subRes, sessionRes]) => {
      setData(subRes.data);
      if (sessionRes.data.session) {
        setActiveSession(sessionRes.data.session);
        fetchSessionStudents(sessionRes.data.session.sessionId);
      }
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [user, subjectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchSessionStudents = async (sessionId) => {
    try {
      const res = await getSessionStudents(sessionId);
      setSessionStudents(res.data.records || []);
    } catch {}
  };

  // Countdown timer
  useEffect(() => {
    if (!activeSession) { setCountdown(null); return; }
    const tick = () => {
      const remaining = new Date(activeSession.expiresAt) - new Date();
      if (remaining <= 0) {
        setCountdown('Expired');
        setActiveSession(null);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Poll students
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => fetchSessionStudents(activeSession.sessionId), 10000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // --- THE FIX: Handle Location + QR Generation ---
  const handleGenerateQR = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setGenerating(true);

    // Request Location First
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log("Teacher Location Captured:", latitude, longitude);

        try {
          // Send location data to your API helper
          const res = await generateQR(subjectId, duration, latitude, longitude);
          
          setActiveSession(res.data.session);
          setSessionStudents([]);
          setQrTab('qr');
          fetchData();
        } catch (err) {
          alert(err.response?.data?.error || 'Failed to generate QR code');
        } finally {
          setGenerating(false);
        }
      },
      (error) => {
        setGenerating(false);
        console.error("Location Error:", error);
        alert("Please allow location access to set the classroom reference point.");
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0 
      }
    );
  };

  const handleInvalidate = async () => {
    if (!activeSession) return;
    if (!confirm('End the current QR session?')) return;
    try {
      await invalidateSession(activeSession.sessionId);
      setActiveSession(null);
      setSessionStudents([]);
      setCountdown(null);
      fetchData();
    } catch {}
  };

  const handleDownloadCSV = () => {
    const url = downloadSubjectCSV(subjectId);
    const a = document.createElement('a');
    a.href = url;
    a.click();
  };

  if (authLoading || loading) return <LoadingPage />;
  if (!data) return null;

  const { subject, studentStats, sessions, monthlyTrend } = data;
  const trendData = monthlyTrend.map(m => ({
    month: `${m._id.year}/${String(m._id.month).padStart(2,'0')}`,
    count: m.count
  }));
  const subColor = subject.color || '#7c3aed';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0f' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
        
        {/* Header Section */}
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => router.back()} className="btn-ghost" style={{ marginBottom: 16, fontSize: 13 }}>
            ← Back to Dashboard
          </button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: subColor }} />
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{subject.code}</span>
                <span className={`badge ${activeSession ? 'badge-green' : 'badge-amber'}`}>
                  {activeSession ? '● Live Session' : '○ No Active Session'}
                </span>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{subject.name}</h1>
              <p style={{ color: '#94a3b8', fontSize: 14 }}>
                {subject.totalStudents} students · {subject.totalClasses} classes conducted
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {!activeSession ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    className="input-field"
                    style={{ width: 120, padding: '10px 12px', fontSize: 13, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: 'white' }}
                  >
                    <option value={5}>5 mins</option>
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                  </select>
                  <button 
                    className="btn-primary" 
                    onClick={handleGenerateQR} 
                    disabled={generating}
                    style={{ background: '#7c3aed', padding: '10px 20px', borderRadius: 10, border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {generating ? 'Locating...' : '⬡ Generate QR'}
                  </button>
                </div>
              ) : (
                <button onClick={handleInvalidate} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid #f43f5e', color: '#fca5a5', padding: '10px 18px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
                  ✕ End Session
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: activeSession ? '1fr 380px' : '1fr', gap: 20 }}>
          
          {/* Main Content (Stats & Table) */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
              <div className="stat-card" style={{ background: '#1e293b', padding: 20, borderRadius: 16 }}>
                <p style={{ fontSize: 11, color: '#94a3b8' }}>TOTAL CLASSES</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#7c3aed' }}>{subject.totalClasses}</p>
              </div>
              <div className="stat-card" style={{ background: '#1e293b', padding: 20, borderRadius: 16 }}>
                <p style={{ fontSize: 11, color: '#94a3b8' }}>STUDENTS</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#14b8a6' }}>{subject.totalStudents}</p>
              </div>
              <div className="stat-card" style={{ background: '#1e293b', padding: 20, borderRadius: 16 }}>
                <p style={{ fontSize: 11, color: '#94a3b8' }}>AVG RATE</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>
                  {studentStats.length > 0 ? `${Math.round(studentStats.reduce((s, x) => s + x.percentage, 0) / studentStats.length)}%` : '0%'}
                </p>
              </div>
            </div>

            {/* Table */}
            <div style={{ background: '#1e293b', padding: 22, borderRadius: 20, border: '1px solid #334155' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#94a3b8', fontSize: 12 }}>
                    <th style={{ padding: 12 }}>ROLL NO</th>
                    <th style={{ padding: 12 }}>NAME</th>
                    <th style={{ padding: 12 }}>ATTENDED</th>
                    <th style={{ padding: 12 }}>PERCENTAGE</th>
                  </tr>
                </thead>
                <tbody>
                  {studentStats.map((s) => (
                    <tr key={s.student._id} style={{ borderTop: '1px solid #334155' }}>
                      <td style={{ padding: 12, fontSize: 13 }}>{s.student.rollNumber}</td>
                      <td style={{ padding: 12, fontWeight: 600 }}>{s.student.name}</td>
                      <td style={{ padding: 12 }}>{s.attended}</td>
                      <td style={{ padding: 12 }}>
                        <span style={{ color: s.percentage >= 75 ? '#10b981' : '#f43f5e', fontWeight: 700 }}>
                          {s.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* QR Panel (Right Side) */}
          {activeSession && (
            <div style={{ background: '#1e293b', padding: 24, borderRadius: 24, border: '1px solid #7c3aed', textAlign: 'center', height: 'fit-content' }}>
               <div style={{ marginBottom: 20, display: 'flex', background: '#0f172a', padding: 4, borderRadius: 10 }}>
                  <button onClick={() => setQrTab('qr')} style={{ flex: 1, padding: 8, background: qrTab === 'qr' ? '#7c3aed' : 'transparent', border: 'none', color: 'white', borderRadius: 8 }}>QR</button>
                  <button onClick={() => setQrTab('students')} style={{ flex: 1, padding: 8, background: qrTab === 'students' ? '#7c3aed' : 'transparent', border: 'none', color: 'white', borderRadius: 8 }}>Students ({sessionStudents.length})</button>
               </div>

               {qrTab === 'qr' ? (
                 <>
                  <p style={{ color: '#94a3b8', fontSize: 12 }}>Expires in</p>
                  <p style={{ fontSize: 32, fontWeight: 800, color: '#10b981', marginBottom: 20 }}>{countdown}</p>
                  <div style={{ background: 'white', padding: 16, borderRadius: 16, display: 'inline-block' }}>
                    <img src={activeSession.qrCodeImage} alt="QR" style={{ width: 220, height: 220 }} />
                  </div>
                  <p style={{ marginTop: 16, fontSize: 12, color: '#94a3b8' }}>Location Captured & Verified</p>
                 </>
               ) : (
                 <div style={{ textAlign: 'left', maxHeight: 400, overflowY: 'auto' }}>
                    {sessionStudents.map((r, i) => (
                      <div key={i} style={{ padding: 10, borderBottom: '1px solid #334155', fontSize: 14 }}>
                        {r.student.name} <span style={{ float: 'right', color: '#10b981' }}>{r.distance}m</span>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function LoadingPage() {
  return <div style={{ background: '#0a0a0f', color: 'white', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading AttendX...</div>;
}
