'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import map so it doesn't cause SSR issues
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0F1628',
      color: '#F97316',
      fontSize: 20,
      fontFamily: 'IBM Plex Sans, sans-serif',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{
        width: 48,
        height: 48,
        border: '3px solid #F9731633',
        borderTop: '3px solid #F97316',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <span>Loading Map…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
});

export default function MapPage() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Back to Home */}
      <Link
        href="/"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 2000,
          background: 'rgba(15,22,40,0.92)',
          border: '1px solid rgba(249,115,22,0.4)',
          color: '#F97316',
          padding: '8px 16px',
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.2s',
          fontFamily: 'IBM Plex Sans, sans-serif',
        }}
      >
        ← OSM Localize
      </Link>

      <MapView />
    </div>
  );
}
