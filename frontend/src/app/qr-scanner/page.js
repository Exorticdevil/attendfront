'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function QRScannerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const html5QrRef = useRef(null);
  
  // Status: idle | scanning | success | error
  const [status, setStatus] = useState('idle'); 
  const [errorMsg, setErrorMsg] = useState('');
  const [scanned, setScanned] = useState(false);

  // 1. Auth & Role Protection
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user?.role !== 'student') router.push('/teacher/dashboard');
  }, [user, authLoading, router]);

  // 2. The Core Fix: Initialize camera only when status is 'scanning'
  useEffect(() => {
    let scanner = null;

    const startCamera = async () => {
      if (status !== 'scanning') return;

      try {
        // Dynamically import to avoid SSR issues
        const { Html5Qrcode } = await import('html5-qrcode');
        
        // Ensure any previous instance is cleaned up
        if (html5QrRef.current) {
          try { await html5QrRef.current.stop(); } catch (e) {}
        }

        scanner = new Html5Qrcode("qr-reader");
        html5QrRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        // Start scanning
        await scanner.start(
          { facingMode: "environment" }, // Forces back camera on mobile
          config,
          (decodedText) => {
            if (!scanned) handleScanSuccess(decodedText);
          },
          () => {} // Ignore per-frame noise
        );
      } catch (err) {
        console.error("Camera Hardware Error:", err);
        setStatus('error');
        setErrorMsg("Could not access camera. Please ensure permissions are granted and no other app is using it.");
      }
    };

    startCamera();

    // Cleanup: Stop camera if user leaves page or status changes
    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, [status]); // Trigger whenever status changes to/from 'scanning'

  const handleScanSuccess = async (decodedText) => {
    setScanned(true);
    
    // Stop hardware immediately
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop(); } catch (e) {}
      html5QrRef.current = null;
    }

    setStatus('success');

    // Parse the Session ID from the QR (URL or Raw String)
    let sessionId = null;
    try {
      const url = new URL(decodedText);
      sessionId = url.searchParams.get('session');
    } catch {
      if (decodedText.length > 10) sessionId = decodedText.trim();
    }

    if (!sessionId) {
      setStatus('error');
      setErrorMsg('Invalid QR Code. Please scan a valid AttendX code.');
      setScanned(false);
      return;
    }

    // Haptic feedback (vibrate) if supported
    if (navigator.vibrate) navigator.vibrate(100);

    // Redirect to the actual attendance marking logic page
    setTimeout(() => {
      router.push(`/scan?session=${encodeURIComponent(sessionId)}`);
    }, 800);
  };

  if (authLoading) return <div className="loader-container">Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '24px 16px', fontFamily: 'sans-serif' }}>
      
      {/* Header Area */}
      <div style={{ maxWidth: 440, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <button 
            onClick={() => router.push('/student/dashboard')}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}
          >
            ← Dashboard
          </button>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#7c3aed' }}>AttendX</div>
          <div style={{ width: 40 }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>Scan QR Code</h1>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Point your camera at the teacher's screen</p>
        </div>

        {/* Main Interface Logic */}
        <div style={{ position: 'relative' }}>
          
          {/* IDLE STATE */}
          {status === 'idle' && (
            <div style={{ background: '#1e293b', padding: '48px 24px', borderRadius: 24, textAlign: 'center', border: '1px solid #334155' }}>
              <div style={{ fontSize: 64, marginBottom: 24 }}>📸</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Ready to Scan?</h2>
              <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 32, lineHeight: 1.5 }}>
                Ensure the QR code is well-lit and fully visible on the screen.
              </p>
              <button 
                onClick={() => setStatus('scanning')}
                style={{ 
                  background: '#7c3aed', color: 'white', width: '100%', 
                  padding: '16px', borderRadius: '14px', border: 'none', 
                  fontWeight: 700, fontSize: 16, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' 
                }}
              >
                Open Camera
              </button>
            </div>
          )}

          {/* SCANNING STATE (The Viewfinder) */}
          <div style={{ display: status === 'scanning' ? 'block' : 'none' }}>
            <div 
              id="qr-reader" 
              style={{ 
                width: '100%', 
                borderRadius: '24px', 
                overflow: 'hidden', 
                border: '2px solid #7c3aed',
                background: '#000',
                boxShadow: '0 0 30px rgba(124, 58, 237, 0.2)'
              }} 
            />
            <button 
              onClick={() => setStatus('idle')}
              style={{ 
                width: '100%', marginTop: 16, background: 'rgba(255,255,255,0.05)', 
                border: '1px solid #334155', color: '#94a3b8', 
                padding: '12px', borderRadius: '12px', cursor: 'pointer' 
              }}
            >
              Cancel Scan
            </button>
          </div>

          {/* SUCCESS STATE */}
          {status === 'success' && (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: '#064e3b', borderRadius: 24, border: '1px solid #10b981' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <h2 style={{ color: '#10b981', fontWeight: 800 }}>QR Detected</h2>
              <p style={{ color: '#a7f3d0' }}>Redirecting to mark attendance...</p>
            </div>
          )}

          {/* ERROR STATE */}
          {status === 'error' && (
            <div style={{ padding: '32px 24px', background: '#451a1a', borderRadius: 24, textAlign: 'center', border: '1px solid #f43f5e' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
              <p style={{ color: '#fca5a5', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>{errorMsg}</p>
              <button 
                onClick={() => { setStatus('idle'); setScanned(false); }}
                style={{ background: '#f43f5e', color: 'white', padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global CSS Overrides for the library */}
      <style jsx global>{`
        #qr-reader video {
          width: 100% !important;
          height: auto !important;
          object-fit: cover !important;
          border-radius: 24px !important;
        }
        #qr-reader__dashboard { display: none !important; }
        #qr-reader img { display: none !important; }
        #qr-reader__header_message { display: none !important; }
      `}</style>
    </div>
  );
}
