'use client';

import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Map, LogOut, ExternalLink, Globe, GitCommit,
  Calendar, Activity, Award, ChevronRight, User,
  Languages, Clock, Star, Layers, Settings
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OsmProfile {
  id: number;
  displayName: string;
  accountCreated: string;
  description: string;
  image: string | null;
  changesets: number;
  traces: number;
}

interface Changeset {
  id: number;
  createdAt: string;
  closedAt: string;
  open: boolean;
  changesCount: number;
  commentsCount: number;
  comment: string;
}

interface TranslationStats {
  total: number;
  byLanguage: Record<string, number>;
  recentActivity: { id: string; languageCode: string; value: string; createdAt: string }[];
}

interface ProfileData {
  user: any;
  osmProfile: OsmProfile | null;
  recentChangesets: Changeset[];
  translationStats: TranslationStats | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const timeSince = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string | number; color: string;
}) {
  return (
    <div className="dashboard-card p-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}22`, border: `1px solid ${color}44` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-sm text-white/50 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 80 }: { src?: string | null; name?: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        width={size}
        height={size}
        className="rounded-full object-cover border-4 border-[#F97316]/40 shadow-xl"
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold border-4 border-[#F97316]/40 shadow-xl"
      style={{ width: size, height: size, fontSize: size * 0.35, backgroundColor: '#F97316' }}
    >
      {(name || 'U')[0].toUpperCase()}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ count }: { count: number }) {
  if (count >= 50) return (
    <span className="badge badge-gold">🌟 Bahubhashi</span>
  );
  if (count >= 10) return (
    <span className="badge badge-silver">🏆 Shataka</span>
  );
  return (
    <span className="badge badge-bronze">🌱 Mapper</span>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // Fetch profile
  useEffect(() => {
    if (status !== 'authenticated') return;
    const load = async () => {
      try {
        const res = await fetch('/api/osm/profile');
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        setProfileData(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [status]);

  if (status === 'loading' || loading) {
    return (
      <div className="dashboard-root flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#F97316]/30 border-t-[#F97316] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading your OSM profile…</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const user = profileData?.user || session.user;
  const osmProfile = profileData?.osmProfile;
  const changesets = profileData?.recentChangesets || [];
  const translationStats = profileData?.translationStats;
  const isOsmUser = (user as any)?.provider === 'openstreetmap' || (user as any)?.osmId;

  const displayName = osmProfile?.displayName || (user as any)?.osmDisplayName || user?.name || 'Contributor';
  const avatar = osmProfile?.image || (user as any)?.image;
  const changesetCount = osmProfile?.changesets ?? (user as any)?.osmChangesetCount ?? 0;
  const accountCreated = osmProfile?.accountCreated || (user as any)?.osmAccountCreated;
  const translationCount = translationStats?.total ?? 0;

  return (
    <>
      <style>{`
        .dashboard-root {
          min-height: 100vh;
          background: #0F1628;
          background-image: radial-gradient(ellipse at top left, rgba(249,115,22,0.08) 0%, transparent 50%),
                            radial-gradient(ellipse at bottom right, rgba(59,130,246,0.06) 0%, transparent 50%);
          font-family: 'Inter', sans-serif;
          color: white;
        }
        .dashboard-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          transition: all 0.2s;
        }
        .dashboard-card:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(249,115,22,0.2);
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.03em;
        }
        .badge-gold { background: rgba(245,158,11,0.2); color: #F59E0B; border: 1px solid rgba(245,158,11,0.3); }
        .badge-silver { background: rgba(148,163,184,0.2); color: #94A3B8; border: 1px solid rgba(148,163,184,0.3); }
        .badge-bronze { background: rgba(52,211,153,0.15); color: #34D399; border: 1px solid rgba(52,211,153,0.3); }
        .osm-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(121,183,60,0.15);
          border: 1px solid rgba(121,183,60,0.3);
          color: #79B73C;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }
        .cs-row {
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 14px 0;
          transition: all 0.15s;
        }
        .cs-row:last-child { border-bottom: none; }
        .cs-row:hover { padding-left: 6px; }
        .nav-blur {
          background: rgba(15,22,40,0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
      `}</style>

      <div className="dashboard-root">
        {/* ── Navbar ── */}
        <nav className="nav-blur sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-white hover:text-[#F97316] transition">
              OSM Localize
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/map"
                className="hidden sm:flex items-center gap-1.5 text-white/60 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition text-sm">
                <Map size={15} /> Live Map
              </Link>
              <Link href="/#languages"
                className="hidden sm:flex items-center gap-1.5 text-white/60 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition text-sm">
                <Globe size={15} /> Translate
              </Link>
              <Link href="/profile"
                className="hidden sm:flex items-center gap-1.5 text-white/60 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition text-sm">
                <Settings size={15} /> Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 text-white/60 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/10 transition text-sm border border-white/10 hover:border-red-500/30"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-4 py-10">

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm">
              ⚠️ {error} — showing cached session data.
            </div>
          )}

          {/* ── Profile Hero ── */}
          <div className="dashboard-card p-8 mb-8 relative overflow-hidden">
            {/* Background accent */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#F97316]/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#F97316]/60 to-transparent" />

            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center relative z-10">
              <Avatar src={avatar} name={displayName} size={96} />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{displayName}</h1>
                  {isOsmUser && (
                    <span className="osm-tag">
                      <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor">
                        <path d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0zm0 236.8C63.5 236.8 19.2 192.5 19.2 128S63.5 19.2 128 19.2 236.8 63.5 236.8 128 192.5 236.8 128 236.8z"/>
                      </svg>
                      OSM Account
                    </span>
                  )}
                  <Badge count={translationCount} />
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-white/50">
                  {user?.email && (
                    <span className="flex items-center gap-1.5">
                      <User size={13} /> {user.email}
                    </span>
                  )}
                  {(user as any)?.osmId && (
                    <span className="flex items-center gap-1.5">
                      <Layers size={13} /> OSM ID: {(user as any).osmId}
                    </span>
                  )}
                  {accountCreated && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} /> Member since {formatDate(accountCreated)}
                    </span>
                  )}
                </div>

                {osmProfile?.description && (
                  <p className="mt-3 text-white/60 text-sm max-w-xl">{osmProfile.description}</p>
                )}
              </div>

              {isOsmUser && (user as any)?.osmId && (
                <a
                  href={`https://www.openstreetmap.org/user/${displayName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm bg-[#79B73C]/10 hover:bg-[#79B73C]/20 text-[#79B73C] border border-[#79B73C]/30 px-4 py-2.5 rounded-xl transition font-medium whitespace-nowrap"
                >
                  <ExternalLink size={14} /> View on OSM
                </a>
              )}
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={GitCommit} label="OSM Changesets" value={changesetCount.toLocaleString()} color="#F97316" />
            <StatCard icon={Languages} label="Translations" value={translationCount} color="#3B82F6" />
            <StatCard icon={Globe} label="Languages" value={Object.keys(translationStats?.byLanguage || {}).length || 0} color="#10B981" />
            <StatCard icon={Activity} label="Recent Changes" value={changesets.length} color="#8B5CF6" />
          </div>

          {/* ── Two-column layout ── */}
          <div className="grid lg:grid-cols-2 gap-6">

            {/* Recent OSM Changesets */}
            <div className="dashboard-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <GitCommit size={18} className="text-[#F97316]" />
                  Recent Changesets
                </h2>
                {isOsmUser && (user as any)?.osmId && (
                  <a
                    href={`https://www.openstreetmap.org/user/${displayName}/history`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/40 hover:text-[#F97316] flex items-center gap-1 transition"
                  >
                    View all <ExternalLink size={11} />
                  </a>
                )}
              </div>

              {changesets.length === 0 ? (
                <div className="text-center py-12">
                  {isOsmUser ? (
                    <>
                      <GitCommit size={36} className="mx-auto mb-3 text-white/20" />
                      <p className="text-white/40 text-sm">No recent changesets found</p>
                      <a
                        href="https://www.openstreetmap.org/edit"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-4 text-[#F97316] text-sm hover:underline"
                      >
                        Start editing on OSM <ExternalLink size={12} />
                      </a>
                    </>
                  ) : (
                    <>
                      <Map size={36} className="mx-auto mb-3 text-white/20" />
                      <p className="text-white/40 text-sm mb-3">Connect your OpenStreetMap account to see your changesets</p>
                      <button
                        onClick={() => signIn('openstreetmap', { callbackUrl: '/dashboard' })}
                        className="inline-flex items-center gap-2 bg-[#79B73C]/10 border border-[#79B73C]/30 text-[#79B73C] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#79B73C]/20 transition"
                      >
                        <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor">
                          <path d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0zm0 236.8C63.5 236.8 19.2 192.5 19.2 128S63.5 19.2 128 19.2 236.8 63.5 236.8 128 192.5 236.8 128 236.8z"/>
                        </svg>
                        Connect OpenStreetMap Account
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  {changesets.map((cs) => (
                    <div key={cs.id} className="cs-row">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80 truncate font-medium">{cs.comment}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                              <Clock size={10} /> {timeSince(cs.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity size={10} /> {cs.changesCount} changes
                            </span>
                          </div>
                        </div>
                        <a
                          href={`https://www.openstreetmap.org/changeset/${cs.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-[#F97316]/20 text-white/30 hover:text-[#F97316] transition"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Translation Activity */}
            <div className="dashboard-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Languages size={18} className="text-[#3B82F6]" />
                  Translation Activity
                </h2>
                <a href="/languages"
                className="text-xs text-white/40 hover:text-[#3B82F6] flex items-center gap-1 transition">
                Translate more <ChevronRight size={11} />
              </a>
              </div>

              {/* By Language breakdown */}
              {translationStats && Object.keys(translationStats.byLanguage).length > 0 ? (
                <div className="space-y-3 mb-6">
                  {Object.entries(translationStats.byLanguage)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([lang, count]) => {
                      const max = Math.max(...Object.values(translationStats.byLanguage));
                      const pct = Math.round((count / max) * 100);
                      return (
                        <div key={lang}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-white/70 capitalize">{lang}</span>
                            <span className="text-white/40">{count}</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, backgroundColor: '#3B82F6' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 mb-4">
                  <Star size={36} className="mx-auto mb-3 text-white/20" />
                  <p className="text-white/40 text-sm">No translations yet</p>
                </div>
              )}

              {/* Recent translations */}
              {translationStats && translationStats.recentActivity.length > 0 && (
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-wider mb-3 font-semibold">Recent</p>
                  {translationStats.recentActivity.map((t) => (
                    <div key={t.id} className="cs-row">
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20 px-2 py-0.5 rounded font-medium uppercase">
                          {t.languageCode}
                        </span>
                        <p className="text-sm text-white/60 truncate flex-1">{t.value}</p>
                        <span className="text-xs text-white/30 flex-shrink-0">{timeSince(t.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA */}
              <a
                href="/#languages"
                className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#3B82F6]/30 text-[#3B82F6] hover:bg-[#3B82F6]/10 transition text-sm font-medium"
              >
                <Languages size={15} /> Start Contributing
              </a>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/map"
              className="dashboard-card p-5 flex items-center gap-4 cursor-pointer hover:border-[#F97316]/30 group">
              <div className="w-10 h-10 rounded-xl bg-[#F97316]/10 border border-[#F97316]/20 flex items-center justify-center group-hover:bg-[#F97316]/20 transition">
                <Map size={18} className="text-[#F97316]" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Live Map</p>
                <p className="text-xs text-white/40">Explore localized OSM</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-white/20 group-hover:text-[#F97316] transition" />
            </Link>

            <a href="/#languages"
              className="dashboard-card p-5 flex items-center gap-4 cursor-pointer hover:border-[#3B82F6]/30 group">
              <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center group-hover:bg-[#3B82F6]/20 transition">
                <Languages size={18} className="text-[#3B82F6]" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Translate</p>
                <p className="text-xs text-white/40">Add translations</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-white/20 group-hover:text-[#3B82F6] transition" />
            </a>

            <a
              href={isOsmUser ? `https://www.openstreetmap.org/user/${displayName}` : 'https://www.openstreetmap.org'}
              target="_blank"
              rel="noopener noreferrer"
              className="dashboard-card p-5 flex items-center gap-4 cursor-pointer hover:border-[#79B73C]/30 group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#79B73C]/10 border border-[#79B73C]/20 flex items-center justify-center group-hover:bg-[#79B73C]/20 transition">
                <Globe size={18} className="text-[#79B73C]" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">OpenStreetMap</p>
                <p className="text-xs text-white/40">{isOsmUser ? 'My OSM profile' : 'Visit OSM'}</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-white/20 group-hover:text-[#79B73C] transition" />
            </a>
          </div>

          {/* ── Achievement Banner ── */}
          {translationCount > 0 && (
            <div className="mt-6 dashboard-card p-6 border-[#F97316]/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#F97316]/5 to-transparent pointer-events-none" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#F97316]/20 border border-[#F97316]/30 flex items-center justify-center text-xl">
                  {translationCount >= 50 ? '🌟' : translationCount >= 10 ? '🏆' : '🌱'}
                </div>
                <div>
                  <p className="font-bold text-white">
                    {translationCount >= 50
                      ? 'Bahubhashi — Multilingual Master!'
                      : translationCount >= 10
                      ? 'Shataka — Century Translator!'
                      : 'Mapper — Keep going!'}
                  </p>
                  <p className="text-sm text-white/50">
                    You've contributed <span className="text-[#F97316] font-semibold">{translationCount} translations</span> to OpenStreetMap localization.
                    {translationCount < 10 && ` ${10 - translationCount} more to reach Shataka rank!`}
                    {translationCount >= 10 && translationCount < 50 && ` ${50 - translationCount} more to reach Bahubhashi rank!`}
                  </p>
                </div>
                <Award size={32} className="ml-auto text-[#F97316]/30 hidden sm:block" />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
