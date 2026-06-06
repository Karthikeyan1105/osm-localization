'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

// ── OSM Logo ──────────────────────────────────────────────────────────────────
function OsmLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" aria-label="OpenStreetMap logo">
      <path d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0zm0 236.8C63.5 236.8 19.2 192.5 19.2 128S63.5 19.2 128 19.2 236.8 63.5 236.8 128 192.5 236.8 128 236.8z"/>
      <path d="M128 48c-44.2 0-80 35.8-80 80s35.8 80 80 80 80-35.8 80-80-35.8-80-80-80zm0 140c-33.1 0-60-26.9-60-60s26.9-60 60-60 60 26.9 60 60-26.9 60-60 60z"/>
    </svg>
  );
}

// ── Eye Icon ──────────────────────────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fadeInDown">
      <div className="flex items-center gap-3 bg-green-500/15 border border-green-500/40 text-green-400 text-sm px-5 py-3 rounded-2xl shadow-xl backdrop-blur-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        {message}
      </div>
    </div>
  );
}

// ── Inner login component (uses useSearchParams, must be inside Suspense) ─────
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [osmLoading, setOsmLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Show success toast when redirected after registration
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setToast('🎉 Account created! Please sign in.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError('Invalid email or password. Please try again.');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  const handleOsmSignIn = async () => {
    setOsmLoading(true);
    await signIn('openstreetmap', { callbackUrl: '/dashboard' });
  };

  return (
    <>
      {toast && <SuccessToast message={toast} onClose={() => setToast('')} />}

      <div className="min-h-screen flex items-center justify-center bg-[#0F1628] font-sans relative overflow-hidden">

        {/* Decorative blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#F97316]/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[150px] pointer-events-none" />
        <div className="absolute top-[30%] right-[20%] w-[20%] h-[20%] rounded-full bg-[#79B73C]/5 blur-[80px] pointer-events-none" />

        <div className="w-full max-w-md z-10 px-4">

          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold text-white hover:text-[#F97316] transition">
              <span className="text-[#F97316]">OSM</span> Localize
            </Link>
          </div>

          <div className="bg-[#161D32]/80 backdrop-blur-xl border border-[#F97316]/20 p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden">

            {/* Top glow line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F97316] to-transparent opacity-80" />

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
              <p className="text-slate-400 text-sm">Sign in to your OSM Localize account</p>
            </div>

            {/* ── OSM OAuth Button (Primary CTA) ── */}
            <button
              id="osm-sso-btn"
              type="button"
              onClick={handleOsmSignIn}
              disabled={osmLoading}
              className="w-full relative overflow-hidden group bg-gradient-to-r from-[#79B73C] to-[#5a9128] hover:from-[#8acc44] hover:to-[#6aaa30] disabled:opacity-70 text-white py-3.5 px-4 rounded-xl transition-all font-semibold flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(121,183,60,0.25)] hover:shadow-[0_0_30px_rgba(121,183,60,0.4)] mb-2"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              {osmLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <OsmLogo size={20} />
              )}
              <span>{osmLoading ? 'Redirecting to OSM…' : 'Continue with OpenStreetMap'}</span>
            </button>

            <p className="text-center text-xs text-slate-500 mb-6">
              Use your real OSM account to track changesets &amp; contributions
            </p>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px bg-[#2A344A] flex-1" />
              <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">or sign in with email</span>
              <div className="h-px bg-[#2A344A] flex-1" />
            </div>

            {/* ── Error ── */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm p-3 rounded-xl mb-5 text-center">
                {error}
              </div>
            )}

            {/* ── Credentials Form ── */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-[#0F1628]/50 border border-[#2A344A] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-[#0F1628]/50 border border-[#2A344A] rounded-xl px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-600 bg-slate-800 text-[#F97316] focus:ring-[#F97316]" />
                  <span className="text-slate-400">Remember me</span>
                </label>
                <Link href="/profile" className="text-[#F97316] hover:text-[#F97316]/80 transition-colors">
                  Forgot Password?
                </Link>
              </div>

              <button
                id="email-signin-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold py-3 px-4 rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] transition-all flex items-center justify-center disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-[#F97316] hover:underline font-medium">Sign up</Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translate(-50%, -16px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fadeInDown { animation: fadeInDown 0.3s ease; }
      `}</style>
    </>
  );
}

// ── Default export wrapped in Suspense (required for useSearchParams) ─────────
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0F1628]">
        <div className="w-12 h-12 border-4 border-[#F97316]/30 border-t-[#F97316] rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
