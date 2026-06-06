'use client';

import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  User, Mail, Lock, Globe, LogOut, ChevronRight,
  Check, X, Eye, EyeOff, Shield, Link2, Map,
  Calendar, GitCommit, AlertTriangle, RefreshCw
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#f97316' };
  if (score <= 3) return { score, label: 'Good', color: '#eab308' };
  return { score, label: 'Strong', color: '#22c55e' };
}

const formatDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 80 }: { src?: string | null; name?: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: '#F97316' }}
    >
      {(name || 'U')[0].toUpperCase()}
    </div>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, iconColor, children }: {
  title: string; icon: any; iconColor: string; children: React.ReactNode;
}) {
  return (
    <div className="profile-card p-6 mb-5">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${iconColor}20`, border: `1px solid ${iconColor}40` }}
        >
          <Icon size={17} style={{ color: iconColor }} />
        </div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
function FormInput({
  id, label, type = 'text', value, onChange, placeholder, disabled, extra
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; extra?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-[#0F1628]/50 border border-[#2A344A] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={isPassword ? { paddingRight: '3rem' } : undefined}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
            aria-label={show ? 'Hide' : 'Show'}
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {extra}
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed top-6 right-6 z-50 animate-slideIn">
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl backdrop-blur-sm text-sm"
        style={
          type === 'success'
            ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', color: '#4ade80' }
            : { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }
        }
      >
        {type === 'success' ? <Check size={15} /> : <X size={15} />}
        {msg}
      </div>
    </div>
  );
}

// ── Main Profile Page ─────────────────────────────────────────────────────────
interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  provider: string;
  osmId: string | null;
  osmDisplayName: string | null;
  osmConnected: boolean;
  createdAt: string | null;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Name edit state
  const [editName, setEditName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);

  // Password state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') =>
    setToast({ msg, type });

  // Load profile
  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await fetch('/api/auth/user');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setEditName(data.name || '');
      }
    } catch {
      showToast('Failed to load profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') loadProfile();
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router, loadProfile]);

  // ── Save display name ──────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!editName.trim() || editName.trim() === profile?.name) return;
    setNameSaving(true);
    try {
      const res = await fetch('/api/auth/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });
      if (res.ok) {
        showToast('Display name updated!');
        await loadProfile();
        await update();
      } else {
        const d = await res.json();
        showToast(d.error || 'Failed to update name', 'error');
      }
    } catch {
      showToast('Failed to update name', 'error');
    } finally {
      setNameSaving(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) { showToast('New passwords do not match', 'error'); return; }
    if (newPwd.length < 8) { showToast('New password must be ≥ 8 characters', 'error'); return; }
    setPwdSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd, confirmPassword: confirmPwd }),
      });
      const d = await res.json();
      if (res.ok) {
        showToast('Password changed successfully!');
        setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      } else {
        showToast(d.error || 'Failed to change password', 'error');
      }
    } catch {
      showToast('Failed to change password', 'error');
    } finally {
      setPwdSaving(false);
    }
  };

  // ── Connect OSM ────────────────────────────────────────────────────────────
  const handleConnectOsm = async () => {
    await signIn('openstreetmap', { callbackUrl: '/profile' });
  };

  // ── Render states ──────────────────────────────────────────────────────────
  if (status === 'loading' || profileLoading) {
    return (
      <div className="profile-root flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#F97316]/30 border-t-[#F97316] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50 text-sm">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (!session || !profile) return null;

  const user = session.user as any;
  const displayName = profile.name || user.name || 'User';
  const isOsmUser = profile.osmConnected || profile.provider === 'openstreetmap';
  const isCredentials = profile.provider === 'credentials';
  const newPwdStrength = getPasswordStrength(newPwd);

  return (
    <>
      <style>{`
        .profile-root {
          min-height: 100vh;
          background: #0F1628;
          background-image:
            radial-gradient(ellipse at top left, rgba(249,115,22,0.07) 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, rgba(59,130,246,0.05) 0%, transparent 50%);
          font-family: 'Inter', sans-serif;
          color: white;
        }
        .profile-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          transition: border-color 0.2s;
        }
        .profile-card:hover { border-color: rgba(255,255,255,0.12); }
        .nav-blur {
          background: rgba(15,22,40,0.85);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .badge-osm {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(121,183,60,0.15);
          border: 1px solid rgba(121,183,60,0.3);
          color: #79B73C; padding: 3px 10px;
          border-radius: 999px; font-size: 12px; font-weight: 600;
        }
        .badge-cred {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(249,115,22,0.12);
          border: 1px solid rgba(249,115,22,0.25);
          color: #F97316; padding: 3px 10px;
          border-radius: 999px; font-size: 12px; font-weight: 600;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slideIn { animation: slideIn 0.25s ease; }
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="profile-root">

        {/* ── Navbar ── */}
        <nav className="nav-blur sticky top-0 z-40">
          <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-white hover:text-[#F97316] transition">
              OSM Localize
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/dashboard"
                className="hidden sm:flex items-center gap-1.5 text-white/60 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition text-sm">
                <Map size={14} /> Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 text-white/60 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/10 transition text-sm border border-white/10 hover:border-red-500/30"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-4 py-10">

          {/* ── Profile Hero ── */}
          <div className="profile-card p-8 mb-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#F97316]/60 to-transparent" />
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#F97316]/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center relative z-10">
              <div className="relative">
                <div className="border-4 border-[#F97316]/30 rounded-full shadow-xl">
                  <Avatar src={profile.image || user?.image} name={displayName} size={88} />
                </div>
                {isOsmUser && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#79B73C] border-2 border-[#0F1628] flex items-center justify-center">
                    <Check size={13} strokeWidth={3} />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h1 className="text-2xl font-bold text-white">{displayName}</h1>
                  {isOsmUser
                    ? <span className="badge-osm"><Globe size={11} /> OSM Connected</span>
                    : <span className="badge-cred"><Shield size={11} /> Email Account</span>
                  }
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-white/45">
                  {profile.email && (
                    <span className="flex items-center gap-1.5"><Mail size={12} /> {profile.email}</span>
                  )}
                  {profile.osmDisplayName && (
                    <span className="flex items-center gap-1.5"><User size={12} /> @{profile.osmDisplayName}</span>
                  )}
                  {profile.createdAt && (
                    <span className="flex items-center gap-1.5"><Calendar size={12} /> Joined {formatDate(profile.createdAt)}</span>
                  )}
                </div>
              </div>

              <button
                onClick={loadProfile}
                className="flex-shrink-0 p-2.5 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/5 transition"
                title="Refresh profile"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* ── Display Name ── */}
          <SectionCard title="Display Name" icon={User} iconColor="#F97316">
            <div className="flex gap-3">
              <input
                id="display-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your display name"
                className="flex-1 bg-[#0F1628]/50 border border-[#2A344A] rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] transition-all"
              />
              <button
                onClick={handleSaveName}
                disabled={nameSaving || !editName.trim() || editName.trim() === profile.name}
                className="px-5 py-3 bg-[#F97316] hover:bg-[#EA580C] disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-semibold text-sm transition-all flex items-center gap-2 min-w-[90px] justify-center"
              >
                {nameSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check size={15} /> Save</>}
              </button>
            </div>
            <p className="text-xs text-white/30 mt-2">This name appears on your dashboard and translations.</p>
          </SectionCard>

          {/* ── Connected Accounts ── */}
          <SectionCard title="Connected Accounts" icon={Link2} iconColor="#3B82F6">
            <div className="space-y-3">

              {/* Email account */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#F97316]/15 border border-[#F97316]/25 flex items-center justify-center">
                    <Mail size={16} className="text-[#F97316]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Email / Password</p>
                    <p className="text-xs text-white/40">{profile.email}</p>
                  </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
                  <Check size={13} /> Connected
                </span>
              </div>

              {/* OSM account */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#79B73C]/15 border border-[#79B73C]/25 flex items-center justify-center">
                    <Globe size={16} className="text-[#79B73C]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">OpenStreetMap</p>
                    {isOsmUser
                      ? <p className="text-xs text-white/40">@{profile.osmDisplayName || 'Connected'}</p>
                      : <p className="text-xs text-white/40">Track your changesets &amp; contributions</p>
                    }
                  </div>
                </div>
                {isOsmUser ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-green-400">
                      <Check size={13} /> Connected
                    </span>
                    {profile.osmId && (
                      <a
                        href={`https://www.openstreetmap.org/user/${profile.osmDisplayName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-white/30 hover:text-[#79B73C] transition ml-1"
                      >
                        <ChevronRight size={14} />
                      </a>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleConnectOsm}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#79B73C] border border-[#79B73C]/30 px-3 py-1.5 rounded-lg hover:bg-[#79B73C]/10 transition"
                  >
                    Connect <ChevronRight size={12} />
                  </button>
                )}
              </div>
            </div>

            {isOsmUser && (
              <div className="mt-4 flex items-center gap-2 text-xs text-white/35 p-3 rounded-xl bg-white/3">
                <GitCommit size={12} />
                Your OSM access token is stored securely and used only to read your public OSM data.
              </div>
            )}
          </SectionCard>

          {/* ── Change Password ── */}
          {isCredentials && (
            <SectionCard title="Change Password" icon={Lock} iconColor="#8B5CF6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <FormInput
                  id="current-password"
                  label="Current Password"
                  type="password"
                  value={currentPwd}
                  onChange={setCurrentPwd}
                  placeholder="Your current password"
                />
                <FormInput
                  id="new-password"
                  label="New Password"
                  type="password"
                  value={newPwd}
                  onChange={setNewPwd}
                  placeholder="Min. 8 characters"
                  extra={newPwd ? (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="h-1 flex-1 rounded-full transition-all"
                            style={{ backgroundColor: i <= newPwdStrength.score ? newPwdStrength.color : '#2A344A' }} />
                        ))}
                      </div>
                      <p className="text-xs" style={{ color: newPwdStrength.color }}>{newPwdStrength.label}</p>
                    </div>
                  ) : null}
                />
                <FormInput
                  id="confirm-new-password"
                  label="Confirm New Password"
                  type="password"
                  value={confirmPwd}
                  onChange={setConfirmPwd}
                  placeholder="Repeat new password"
                  extra={
                    confirmPwd ? (
                      confirmPwd === newPwd
                        ? <p className="text-xs text-green-500 mt-1">✓ Passwords match</p>
                        : <p className="text-xs text-red-400 mt-1">✗ Passwords do not match</p>
                    ) : null
                  }
                />
                <button
                  id="change-password-btn"
                  type="submit"
                  disabled={pwdSaving || !currentPwd || !newPwd || !confirmPwd}
                  className="w-full py-3 bg-[#8B5CF6] hover:bg-[#7c3aed] disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  {pwdSaving
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Lock size={15} /> Update Password</>
                  }
                </button>
              </form>
            </SectionCard>
          )}

          {/* OSM users: password managed by OSM */}
          {!isCredentials && (
            <SectionCard title="Password" icon={Lock} iconColor="#6B7280">
              <div className="flex items-start gap-3 text-sm text-white/50 p-4 rounded-xl bg-white/3 border border-white/6">
                <Globe size={16} className="mt-0.5 flex-shrink-0 text-[#79B73C]" />
                <div>
                  <p className="font-medium text-white/70 mb-1">Password managed by OpenStreetMap</p>
                  <p>Since you signed in with your OSM account, your password is managed on openstreetmap.org.</p>
                  <a
                    href="https://www.openstreetmap.org/user/account"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-[#79B73C] hover:underline text-xs font-medium"
                  >
                    Manage on OSM <ChevronRight size={12} />
                  </a>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── Danger Zone ── */}
          <div className="profile-card p-6 border border-red-500/15">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center">
                <AlertTriangle size={17} className="text-red-400" />
              </div>
              <h2 className="text-base font-semibold text-red-400">Danger Zone</h2>
            </div>
            <p className="text-sm text-white/40 mb-4">
              Signing out will end your current session. You can sign back in at any time.
            </p>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 text-red-400 border border-red-500/30 px-4 py-2.5 rounded-xl hover:bg-red-500/10 transition text-sm font-semibold"
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
