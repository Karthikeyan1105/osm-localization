'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, X, Map, LogOut, User, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { ReactTransliterate } from 'react-transliterate';
import 'react-transliterate/dist/index.css';
import { useSession, signOut } from "next-auth/react";

const PRIMARY_BG = '#0F1628';
const PRIMARY_LIGHT = '#1a1f35';
const CARD_BG = '#F9F5EE';
const ACCENT = '#F97316';
const SUCCESS = '#059669';
const WARNING = '#F59E0B';
const ERROR = '#EF4444';
const INFO = '#3B82F6';

// A dedicated component for each string row securely handles the isolated transliteration state
function TranslationRow({ str, selectedLang, refreshData }) {
  const [value, setValue] = useState(str.translations?.[0]?.value || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value) return;
    setSaving(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceStringId: str.id,
          languageCode: selectedLang.code,
          value: value,
        }),
      });
      if (response.ok) {
        await refreshData();
      }
    } catch (error) {
      console.error('Failed to save translation:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 border-b pb-6">
      <div>
        <p style={{ color: `${PRIMARY_BG}99` }} className="text-sm mb-2 font-semibold">Source ({str.project?.name || 'OpenStreetMap'})</p>
        <div style={{ backgroundColor: 'white', borderColor: `${PRIMARY_BG}1a`, color: PRIMARY_BG }} className="border rounded-lg p-4 min-h-24">
          <p>{str.englishValue}</p>
          <p className="text-xs mt-2 text-slate-400">Key: {str.key}</p>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p style={{ color: `${PRIMARY_BG}99` }} className="text-sm font-semibold">{selectedLang.name}</p>
          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Auto-Transliterate Active</span>
        </div>
        <ReactTransliterate
          value={value}
          onChangeText={(text) => setValue(text)}
          lang={selectedLang.code}
          placeholder={`Type in English phonetics to output in ${selectedLang.name}...`}
          containerClassName="w-full"
          className="w-full min-h-24 p-4 border rounded-lg focus:outline-none resize-none transition-all"
          style={{ borderColor: `${PRIMARY_BG}22`, color: PRIMARY_BG }}
        />
        <button
          onClick={handleSave}
          disabled={saving || !value}
          style={{ backgroundColor: ACCENT }}
          className="mt-3 w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 shadow-sm"
        >
          {saving ? 'Saving...' : 'Save Translation'}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [counters, setCounters] = useState({ languages: 0, translations: 0, contributors: 0 });
  const [selectedLang, setSelectedLang] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [filterActive, setFilterActive] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [translationStrings, setTranslationStrings] = useState([]);
  const [realContributors, setRealContributors] = useState([]);
  const [leaderTab, setLeaderTab] = useState('recent');

  // Fetch languages master list
  const fetchLanguages = async () => {
    try {
      const response = await fetch('/api/languages');
      const data = await response.json();
      if (Array.isArray(data)) setLanguages(data);
    } catch (error) {
      console.error('Failed to fetch languages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const targets = { languages: 14, translations: 45000, contributors: 320 };
    const duration = 2000;
    const startTime = Date.now();

    const animateCounters = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setCounters({
        languages: Math.floor(targets.languages * progress),
        translations: Math.floor(targets.translations * progress),
        contributors: Math.floor(targets.contributors * progress),
      });

      if (progress < 1) requestAnimationFrame(animateCounters);
    };

    animateCounters();
    fetchLanguages();

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openEditor = async (lang) => {
    setSelectedLang(lang);
    setEditorOpen(true);
    try {
      const response = await fetch(`/api/strings?lang=${lang.code}`);
      const data = await response.json();
      setTranslationStrings(data);
    } catch (error) {
      console.error('Failed to fetch strings:', error);
    }
  };

  useEffect(() => {
    const fetchContributors = async () => {
      try {
        const response = await fetch('/api/contributors');
        const res = await response.json();
        if (res.data) setRealContributors(res.data);
      } catch (e) {
        console.error('Leaderboard error', e);
      }
    };
    fetchContributors();
  }, []);

  // Redundant static array removed

  const contributors = [
    { id: 1, name: 'Priya', languages: ['Hindi', 'Sanskrit'], state: 'Maharashtra', badge: 'Pratham', color: '#F97316' },
    { id: 2, name: 'Arjun', languages: ['Tamil', 'Telugu'], state: 'Tamil Nadu', badge: 'Shataka', color: '#059669' },
    { id: 3, name: 'Maya', languages: ['Bengali', 'Assamese'], state: 'West Bengal', badge: 'Bahubhashi', color: '#3B82F6' },
    { id: 4, name: 'Ravi', languages: ['Marathi', 'Hindi'], state: 'Gujarat', badge: 'Pratham', color: '#EC4899' },
    { id: 5, name: 'Sneha', languages: ['Kannada', 'Urdu'], state: 'Karnataka', badge: 'Shataka', color: '#F59E0B' },
    { id: 6, name: 'Vikram', languages: ['Punjabi', 'Nepali'], state: 'Punjab', badge: 'Bahubhashi', color: '#8B5CF6' },
    { id: 7, name: 'Anaya', languages: ['Gujarati', 'Malayalam'], state: 'Kerala', badge: 'Pratham', color: '#06B6D4' },
    { id: 8, name: 'Dhruv', languages: ['Odia', 'Hindi'], state: 'Odisha', badge: 'Shataka', color: '#EF4444' },
    { id: 9, name: 'Zara', languages: ['Urdu', 'Hindi'], state: 'Sindh', badge: 'Bahubhashi', color: '#10B981' },
    { id: 10, name: 'Rohan', languages: ['Telugu', 'Kannada', 'Tamil'], state: 'Andhra Pradesh', badge: 'Shataka', color: '#A78BFA' },
  ];

  const filteredLanguages = languages.filter(lang => {
    const matchesFilter = filterActive === 'All' || lang.status === filterActive;
    const matchesSearch = lang.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         lang.nativeName.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const ProgressRing = ({ progress }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;
    return (
      <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="3" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={ACCENT}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
    );
  };

  return (
    <div style={{
      backgroundColor: PRIMARY_BG,
      backgroundImage: `linear-gradient(to bottom, ${PRIMARY_BG}, ${PRIMARY_LIGHT}), url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
    }} className="min-h-screen">
      {/* Navbar */}
      <nav style={{
        backgroundColor: scrolled ? `rgba(15, 22, 40, 0.8)` : 'transparent',
        borderBottomColor: scrolled ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
      }} className="fixed w-full top-0 z-50 transition-all duration-300 border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-2xl font-bold text-white">OSM Localize</div>
          <div className="hidden md:flex gap-8">
            <a href="#languages" className="text-white/70 hover:text-white transition">Languages</a>
            <a href="#leaderboard" className="text-white/70 hover:text-white transition">Contributors</a>
            <Link href="/map" className="text-white/70 hover:text-white transition flex items-center gap-1">
              <Map size={15} /> Live Map
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="hidden md:flex items-center gap-1.5 text-white/70 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition text-sm"
                >
                  <LayoutDashboard size={15} /> My Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="hidden md:flex items-center gap-1.5 text-white/70 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition text-sm"
                >
                  <User size={15} /> Profile
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-full pl-2 pr-4 py-1.5 border border-white/10 hover:border-[#F97316]/30 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-[#F97316] flex items-center justify-center text-white font-bold shadow-sm overflow-hidden">
                    {(session.user as any)?.image ? (
                      <img src={(session.user as any).image} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      session.user?.name ? session.user.name[0].toUpperCase() : 'U'
                    )}
                  </div>
                  <span className="text-sm font-medium text-white hidden sm:inline">{session.user?.name || session.user?.email?.split('@')[0]}</span>
                </Link>
                <button 
                  onClick={() => signOut()}
                  className="bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white/90 p-2 rounded-lg transition"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="text-white/80 hover:text-white font-medium px-4 py-2 hover:bg-white/10 rounded-lg transition"
                >
                  Log in
                </Link>
                <Link href="/login" style={{ backgroundColor: ACCENT }} className="text-white px-5 py-2 rounded-lg font-semibold hover:opacity-90 transition shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                  Contribute
                </Link>
              </>
            )}
          </div>
        </div>
        {scrolled && <div style={{background: `linear-gradient(to right, ${ACCENT}, transparent)`}} className="h-0.5" />}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center animate-fade-up">
          <div style={{ backgroundColor: `${ACCENT}33`, color: ACCENT }} className="inline-block mb-4 px-3 py-1 rounded-full text-sm font-medium">
            ✨ Making OpenStreetMap accessible in South Asian languages
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Map the World in Your Language
          </h1>
          <p className="text-xl text-white/60 mb-8 max-w-2xl mx-auto">
            Join thousands of translators bringing OpenStreetMap to 14 South Asian languages. Every translation makes the world more accessible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              style={{ backgroundColor: ACCENT }}
              className="text-white px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition"
              onClick={() => document.getElementById('languages')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Contributing
            </button>
            <Link
              href="/map"
              style={{ borderColor: ACCENT, color: ACCENT, display: 'flex', alignItems: 'center', gap: 8 }}
              className="border px-8 py-3 rounded-lg font-semibold hover:bg-orange-500/10 transition justify-center"
            >
              <Map size={18} /> Explore the Map
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }} className="border rounded-lg p-6 backdrop-blur-sm">
              <div style={{ color: ACCENT }} className="text-4xl md:text-5xl font-bold mb-2">{counters.languages}</div>
              <div className="text-white/60">Languages</div>
            </div>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }} className="border rounded-lg p-6 backdrop-blur-sm">
              <div style={{ color: ACCENT }} className="text-4xl md:text-5xl font-bold mb-2">{counters.translations.toLocaleString()}</div>
              <div className="text-white/60">Translations</div>
            </div>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }} className="border rounded-lg p-6 backdrop-blur-sm">
              <div style={{ color: ACCENT }} className="text-4xl md:text-5xl font-bold mb-2">{counters.contributors}</div>
              <div className="text-white/60">Contributors</div>
            </div>
          </div>
        </div>
      </section>

      {/* Language Dashboard */}
      <section id="languages" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white mb-8">Language Dashboard</h2>
          
          {/* Search and Filter */}
          <div className="mb-8 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-white/40" size={20} />
              <input
                type="text"
                placeholder="Search languages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-white placeholder-white/40 focus:outline-none"
                onFocus={(e) => e.currentTarget.style.borderColor = ACCENT}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
              />
            </div>
            <div className="flex gap-2">
              {['All', 'Completed', 'In Progress', 'Needs Work'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterActive(status)}
                  style={{
                    backgroundColor: filterActive === status ? ACCENT : 'rgba(255, 255, 255, 0.1)',
                    color: filterActive === status ? 'white' : 'rgba(255, 255, 255, 0.7)'
                  }}
                  className="px-4 py-2 rounded-lg transition hover:bg-white/20"
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Language Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredLanguages.map((lang) => (
              <div
                key={lang.name}
                style={{ backgroundColor: CARD_BG }}
                className="rounded-lg p-6 hover:shadow-lg transition group cursor-pointer"
                onClick={() => openEditor(lang)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 style={{ color: PRIMARY_BG }} className="text-xl font-bold">{lang.name}</h3>
                    <p style={{ color: `${PRIMARY_BG}99` }} className="text-sm">{lang.nativeName}</p>
                  </div>
                  <div className="w-20 h-20 flex items-center justify-center">
                    <ProgressRing progress={lang.progress} />
                    <div className="absolute text-center">
                      <p style={{ color: PRIMARY_BG }} className="text-sm font-bold">{lang.progress}%</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  <span style={{ backgroundColor: `${SUCCESS}33`, color: SUCCESS }} className="text-xs px-2 py-1 rounded">{lang.script}</span>
                  <span style={{ backgroundColor: `${INFO}33`, color: INFO }} className="text-xs px-2 py-1 rounded">India</span>
                  <span style={{
                    backgroundColor: lang.status === 'Completed' ? `${SUCCESS}33` : lang.status === 'In Progress' ? `${WARNING}33` : `${ERROR}33`,
                    color: lang.status === 'Completed' ? SUCCESS : lang.status === 'In Progress' ? WARNING : ERROR
                  }} className="text-xs px-2 py-1 rounded">
                    {lang.status}
                  </span>
                </div>

                <button style={{ backgroundColor: ACCENT }} className="w-full text-white py-2 rounded-lg font-semibold hover:opacity-90 transition group-hover:scale-105">
                  Contribute
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Translation Editor Modal */}
      {editorOpen && selectedLang && (
        <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} className="fixed inset-0 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
          <div style={{ backgroundColor: CARD_BG }} className="rounded-lg w-full md:max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div style={{ backgroundColor: CARD_BG, borderColor: `${PRIMARY_BG}1a` }} className="sticky top-0 flex items-center justify-between p-6 border-b">
              <h2 style={{ color: PRIMARY_BG }} className="text-2xl font-bold">
                Translate to {selectedLang.name}
              </h2>
              <button
                onClick={() => setEditorOpen(false)}
                style={{ color: `${PRIMARY_BG}99` }}
                className="hover:text-black transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid gap-6 mb-6">
                {translationStrings.length > 0 ? (
                  translationStrings.map((str) => (
                    <TranslationRow 
                      key={str.id} 
                      str={str} 
                      selectedLang={selectedLang} 
                      refreshData={fetchLanguages} 
                    />
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-500">
                    No strings available for translation at the moment.
                  </div>
                )}
              </div>

              <div className="mb-6">
                <p style={{ color: `${PRIMARY_BG}99` }} className="text-xs">Characters: 0 / 150</p>
              </div>

                <button
                  onClick={() => setEditorOpen(false)}
                  style={{ backgroundColor: ACCENT }}
                  className="w-full px-4 py-3 text-white rounded-lg font-semibold hover:opacity-90 transition"
                >
                  Close Editor
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Leaderboard */}
      <section id="leaderboard" className="py-20 px-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
            <h2 className="text-4xl font-bold text-white">Community Heroes</h2>
            
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10 inline-flex">
              <button 
                onClick={() => setLeaderTab('recent')}
                className={`px-6 py-2 rounded-md font-medium transition-all text-sm ${leaderTab === 'recent' ? 'bg-[#F97316] text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                Recent Translators
              </button>
              <button 
                onClick={() => setLeaderTab('top')}
                className={`px-6 py-2 rounded-md font-medium transition-all text-sm ${leaderTab === 'top' ? 'bg-[#F97316] text-white shadow-lg' : 'text-white/60 hover:text-white'}`}
              >
                Top Translators
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {realContributors.length > 0 ? (
              realContributors.map((contributor, idx) => (
                <div key={contributor.id} style={{ backgroundColor: CARD_BG }} className="rounded-lg p-6 flex items-start gap-4 shadow-sm hover:shadow-lg transition">
                  <div className="flex-shrink-0">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-inner"
                      style={{ backgroundColor: ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'][idx % 5] }}
                    >
                      {contributor.name[0].toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 style={{ color: PRIMARY_BG }} className="text-lg font-bold">{contributor.name}</h3>
                      <span style={{ backgroundColor: `${ACCENT}33`, color: ACCENT }} className="text-xs px-2 py-1 rounded-full font-semibold border border-orange-500/20">
                        {leaderTab === 'top' ? `#${idx + 1} Editor` : 'Active'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span style={{ backgroundColor: `${INFO}22`, color: INFO }} className="text-xs px-2 py-1 rounded font-medium border border-blue-500/10">
                        {contributor.count} Translation{contributor.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ color: ACCENT }} className="text-xs font-bold pt-2 border-t border-black/5 mt-1">
                      {contributor.count >= 50 ? '🌟 Bahubhashi' : contributor.count >= 10 ? '🏆 Shataka' : '🌱 Mapper'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-1 md:col-span-2 text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
                <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <User size={32} className="text-white/40" />
                </div>
                <h3 className="text-xl text-white font-semibold mb-2">No translators found</h3>
                <p className="text-white/50">Be the first translator to make an impact on the map today!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* === LIVE MAP PREVIEW SECTION === */}
      <section id="map" style={{ background: 'rgba(0,0,0,0.3)' }} className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-4xl font-bold text-white mb-2">Explore in Your Language</h2>
              <p className="text-white/60">Switch between 8 South Asian languages and watch the map respond — place names, labels, and UI all localized.</p>
            </div>
            <Link
              href="/map"
              style={{ backgroundColor: ACCENT, whiteSpace: 'nowrap' }}
              className="text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2"
            >
              <Map size={18} /> Open Full Map
            </Link>
          </div>

          {/* Embedded map iframe preview */}
          <div style={{
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(249,115,22,0.3)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            height: 480,
            position: 'relative',
          }}>
            <iframe
              src="/map"
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="OSM Multilingual Map Preview"
              loading="lazy"
            />
            {/* Clickable overlay that links to full map */}
            <Link
              href="/map"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'transparent',
                display: 'block',
              }}
              aria-label="Open full map"
            />
          </div>

          {/* Language quick-select row */}
          <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { native: 'हिंदी', name: 'Hindi' },
              { native: 'தமிழ்', name: 'Tamil' },
              { native: 'తెలుగు', name: 'Telugu' },
              { native: 'ಕನ್ನಡ', name: 'Kannada' },
              { native: 'മലയാളം', name: 'Malayalam' },
              { native: 'বাংলা', name: 'Bengali' },
              { native: 'मराठी', name: 'Marathi' },
            ].map((lang) => (
              <Link
                key={lang.name}
                href="/map"
                style={{
                  padding: '8px 20px',
                  borderRadius: 40,
                  border: '1px solid rgba(249,115,22,0.35)',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 14,
                  fontWeight: 600,
                  background: 'rgba(249,115,22,0.08)',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
                {lang.native} <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{lang.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTopColor: 'rgba(255, 255, 255, 0.1)' }} className="border-t py-12 px-4">
        <div className="max-w-6xl mx-auto text-center text-white/60">
          <p>OpenStreetMap is a collaborative project. Help us make maps accessible to everyone.</p>
          <p className="mt-4 text-sm">© 2024 OSM Localize. Open Source • Open Data</p>
        </div>
      </footer>
    </div>
  );
}
