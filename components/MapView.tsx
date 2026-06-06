'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { createRoot, Root } from 'react-dom/client';
import { ReactTransliterate } from 'react-transliterate';
import 'react-transliterate/dist/index.css';

// Language definitions — code maps to the OSM name:xx tag used in vector tiles
const LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    native: 'English',
    osmTag: 'name:en',
    placeholder: 'Search places...',
    myLocation: 'My Location',
    attribution: '© OpenStreetMap contributors',
  },
  {
    code: 'hi',
    name: 'Hindi',
    native: 'हिंदी',
    osmTag: 'name:hi',
    placeholder: 'स्थान खोजें...',
    myLocation: 'मेरी स्थिति',
    attribution: '© ओपनस्ट्रीटमैप',
  },
  {
    code: 'ta',
    name: 'Tamil',
    native: 'தமிழ்',
    osmTag: 'name:ta',
    placeholder: 'இடங்களை தேடுங்கள்...',
    myLocation: 'என் இருப்பிடம்',
    attribution: '© OpenStreetMap',
  },
  {
    code: 'te',
    name: 'Telugu',
    native: 'తెలుగు',
    osmTag: 'name:te',
    placeholder: 'స్థలాలు వెతకండి...',
    myLocation: 'నా స్థానం',
    attribution: '© OpenStreetMap',
  },
  {
    code: 'kn',
    name: 'Kannada',
    native: 'ಕನ್ನಡ',
    osmTag: 'name:kn',
    placeholder: 'ಸ್ಥಳಗಳನ್ನು ಹುಡುಕಿ...',
    myLocation: 'ನನ್ನ ಸ್ಥಳ',
    attribution: '© OpenStreetMap',
  },
  {
    code: 'ml',
    name: 'Malayalam',
    native: 'മലയാളം',
    osmTag: 'name:ml',
    placeholder: 'സ്ഥലങ്ങൾ തിരയുക...',
    myLocation: 'എന്റെ സ്ഥാനം',
    attribution: '© OpenStreetMap',
  },
  {
    code: 'bn',
    name: 'Bengali',
    native: 'বাংলা',
    osmTag: 'name:bn',
    placeholder: 'জায়গা খুঁজুন...',
    myLocation: 'আমার অবস্থান',
    attribution: '© OpenStreetMap',
  },
  {
    code: 'mr',
    name: 'Marathi',
    native: 'मराठी',
    osmTag: 'name:mr',
    placeholder: 'ठिकाणे शोधा...',
    myLocation: 'माझे स्थान',
    attribution: '© OpenStreetMap',
  },
  {
    code: 'gu',
    name: 'Gujarati',
    native: 'ગુજરાતી',
    osmTag: 'name:gu',
    placeholder: 'સ્થળો શોધો...',
    myLocation: 'મારું સ્થાન',
    attribution: '© OpenStreetMap',
  },
  {
    code: 'pa',
    name: 'Punjabi',
    native: 'ਪੰਜਾਬੀ',
    osmTag: 'name:pa',
    placeholder: 'ਥਾਵਾਂ ਲੱਭੋ...',
    myLocation: 'ਮੇਰੀ ਥਾਂ',
    attribution: '© OpenStreetMap',
  },
];

const ACCENT = '#F97316';
const PRIMARY_BG = '#0F1628';

// Build a MapLibre GL expression that resolves language labels in priority order.
// Priority: specific language tag → local/regional 'name' (already in script for Indian regions) → English
// This is critical: placing 'name' BEFORE 'name:en' means Kerala shows Malayalam, Andhra shows Telugu, etc.
// even when explicit name:ml / name:te tags aren't present in the tile.
function buildLabelExpression(lang: typeof LANGUAGES[0]) {
  if (lang.code === 'en') {
    // English: prefer name:en, then local name
    return ['coalesce', ['get', 'name:en'], ['get', 'name']];
  }
  // Indian languages:
  // 1. Try the explicit language tag (name:te, name:ml, etc.)
  // 2. Fall back to 'name' — in that language's home region, OSM 'name' IS in that script
  // 3. Final fallback: English
  return [
    'coalesce',
    ['get', lang.osmTag],  // e.g. name:te  (explicit, most accurate)
    ['get', 'name'],       // local script  (e.g. 'హైదరాబాద్' in Andhra/Telangana)
    ['get', 'name:en'],    // English       (last resort for unlabelled places)
  ];
}

function TranslationPopupUI({ name, type, id, targetLang, targetLangName }: any) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState({ message: '', error: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    setStatus({ message: '', error: false });
    
    try {
      const res = await fetch('/api/osm/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, langCode: targetLang, translatedName: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      
      setStatus({ message: 'Successfully saved! View in OSM shortly.', error: false });
      setSaved(true);
    } catch (err: any) {
      setStatus({ message: 'Error: ' + err.message, error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', color: '#111' }}>
      <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>OSM {type} {id}</div>
      
      {!saved && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Translate to {targetLangName} (type in English):</label>
          <ReactTransliterate
            value={text}
            onChangeText={(t) => setText(t)}
            lang={targetLang}
            placeholder="Type in English (phonetic)..."
            containerStyles={{ border: '1px solid #ccc', borderRadius: 4, overflow: 'hidden' }}
            renderComponent={(props) => <input {...props} required style={{ padding: 6, fontSize: 13, width: '100%', outline: 'none', border: 'none', minWidth: '220px' }} />}
          />
          <button type="submit" disabled={saving} style={{ background: '#F97316', color: '#fff', border: 'none', padding: 6, borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
            {saving ? 'Saving...' : 'Save to OSM'}
          </button>
        </form>
      )}
      {status.message && (
        <div style={{ fontSize: 12, marginTop: 8, color: status.error ? 'red' : 'green', fontWeight: 600 }}>
          {status.message}
        </div>
      )}
    </div>
  );
}

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [activeLang, setActiveLang] = useState(LANGUAGES[0]);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const { data: session }: any = useSession();

  // Apply language to every symbol layer in the loaded style
  const applyLanguage = useCallback((map: any, lang: typeof LANGUAGES[0]) => {
    if (!map || !map.isStyleLoaded()) return;
    const labelExpr = buildLabelExpression(lang);
    const style = map.getStyle();
    if (!style?.layers) return;

    style.layers.forEach((layer: any) => {
      if (layer.type !== 'symbol') return;
      try {
        const current = map.getLayoutProperty(layer.id, 'text-field');
        if (current !== undefined && current !== null && current !== '') {
          // Only update the label content — font weights were set correctly
          // at style-load time and must NOT be overwritten here.
          map.setLayoutProperty(layer.id, 'text-field', labelExpr);
        }
      } catch {
        // ignore layers that don't support text-field
      }
    });
  }, []);

  // Mount the MapLibre map once
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return;

    let mapInstance: any = null;

    const initMap = async () => {
      if (!mapContainer.current || mapRef.current) return;
      const maplibre = await import('maplibre-gl');

      // 1. Fetch the OpenFreeMap style JSON
      let mapStyle: any;
      try {
        const res = await fetch('https://tiles.openfreemap.org/styles/bright');
        mapStyle = await res.json();
      } catch {
        // Fallback to URL if fetch fails
        mapStyle = 'https://tiles.openfreemap.org/styles/bright';
      }

      if (typeof mapStyle === 'object') {
        // 2. Replace the glyph server with protomaps' open GitHub CDN.
        //    This hosts FULL Noto Sans with all Indian script Unicode ranges:
        //    Telugu (0C00-0C7F), Malayalam (0D00-0D7F), Gujarati (0A80-0AFF), etc.
        //    URL format: /fonts/{fontstack}/{range}.pbf where fontstack is a SINGLE font name.
        mapStyle.glyphs = 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf';

        // 3. Map every symbol layer's font to the correct Noto weight.
        //    We inspect the original font name: if it contained 'Bold' or 'Medium'
        //    we use Noto Sans Bold, otherwise Noto Sans Regular.
        //    This preserves the visual hierarchy (country names bold, minor labels regular).
        if (mapStyle.layers) {
          mapStyle.layers.forEach((layer: any) => {
            if (layer.type === 'symbol' && layer.layout?.['text-font']) {
              const origFonts: string[] = Array.isArray(layer.layout['text-font'])
                ? layer.layout['text-font']
                : [layer.layout['text-font']];

              // Check if any of the original fonts were bold/medium weight
              const isBold = origFonts.some((f: string) =>
                /bold|medium|semibold/i.test(f)
              );

              // Assign the correct Noto weight — single font name per array entry
              // (protomaps CDN uses the fontstack name as the URL path segment;
              // comma-joined names in one string cause 404s on this CDN)
              layer.layout['text-font'] = isBold
                ? ['Noto Sans Bold']
                : ['Noto Sans Regular'];
            }
          });
        }
      }

      mapInstance = new maplibre.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [78.9629, 20.5937], // India
        zoom: 4.5,
        attributionControl: false,
      });

      mapInstance.on('load', () => {
        mapRef.current = mapInstance;
        setStyleLoaded(true);
        applyLanguage(mapInstance, LANGUAGES[0]);
      });

      // Handle map clicks for translation
      mapInstance.on('click', async (e: any) => {
        const { lng, lat } = e.lngLat;
        const currentLang = activeLangRef.current; // we need a ref for activeLang, or read from URL later.
        
        // Show loading popup
        const maplibre = await import('maplibre-gl');
        if (markerRef.current) markerRef.current.remove();
        const popup = new maplibre.Popup()
          .setLngLat([lng, lat])
          .setHTML(`<div style="padding: 8px; font-family: sans-serif; color: #111;">Searching nearby OpenStreetMap elements...</div>`)
          .addTo(mapInstance);
        
        try {
          const query = `[out:json];(node(around:50,${lat},${lng})["name"];way(around:50,${lat},${lng})["name"];);out 1;`;
          const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
          if (!res.ok) throw new Error("Overpass API failed");
          const data = await res.json();
          
          if (!data.elements || data.elements.length === 0) {
            popup.setHTML('<div style="padding: 8px; color: #111;">No named places found nearby. Try clicking closer to a label.</div>');
            return;
          }
          
          const el = data.elements[0];
          const name = el.tags?.name || 'Unknown';
          const type = el.type; // node or way
          const id = el.id;
          
          // Generate popup HTML
          const popupContent = document.createElement('div');
          popupContent.style.padding = '8px';
          popupContent.style.minWidth = '240px';
          
          const root = createRoot(popupContent);
          root.render(
            <TranslationPopupUI 
              name={name} 
              type={type} 
              id={id} 
              targetLang={currentLang.code} 
              targetLangName={currentLang.name} 
            />
          );
          
          popup.setDOMContent(popupContent);
          
          // Clean up React root on close
          popup.on('close', () => {
            setTimeout(() => root.unmount(), 100);
          });
        } catch (err) {
          popup.setHTML('<div style="padding: 8px; color: red;">Failed to fetch OSM data.</div>');
        }
      });
    };

    initMap();

    return () => {
      if (mapInstance) {
        mapInstance.remove();
        mapRef.current = null;
      }
    };
  }, [applyLanguage]);

  // Active Language Ref for callbacks
  const activeLangRef = useRef(activeLang);
  useEffect(() => {
    activeLangRef.current = activeLang;
  }, [activeLang]);

  // Re-apply language whenever activeLang changes and style is ready
  useEffect(() => {
    if (styleLoaded && mapRef.current) {
      applyLanguage(mapRef.current, activeLang);
    }
  }, [activeLang, styleLoaded, applyLanguage]);

  // Nominatim search with language preference
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&accept-language=${activeLang.code}&limit=6&addressdetails=1`,
        { headers: { 'Accept-Language': activeLang.code } }
      );
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const flyToResult = async (result: any) => {
    if (!mapRef.current) return;
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    mapRef.current.flyTo({ center: [lon, lat], zoom: 13, duration: 1500 });

    const maplibre = await import('maplibre-gl');
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = new maplibre.Marker({ color: ACCENT })
      .setLngLat([lon, lat])
      .setPopup(new maplibre.Popup().setHTML(`<b>${result.display_name}</b>`))
      .addTo(mapRef.current)
      .togglePopup();

    setSearchResults([]);
    setSearchQuery(result.display_name.split(',')[0]);
  };

  const handleMyLocation = async () => {
    if (!mapRef.current) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        mapRef.current.flyTo({ center: [longitude, latitude], zoom: 14, duration: 1500 });
        const maplibre = await import('maplibre-gl');
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = new maplibre.Marker({ color: ACCENT })
          .setLngLat([longitude, latitude])
          .setPopup(new maplibre.Popup().setHTML(`<b>${activeLang.myLocation}</b>`))
          .addTo(mapRef.current)
          .togglePopup();
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      {/* MapLibre CSS — must be rendered dynamically since we can't import in SSR */}
      <style>{`
        @import url('https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css');
        .maplibregl-canvas { outline: none; }
        .maplibregl-ctrl-attrib { font-size: 10px !important; }
      `}</style>

      {/* Map Container */}
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Loading shimmer */}
      {!styleLoaded && (
        <div style={{
          position: 'absolute', inset: 0, background: PRIMARY_BG,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 16, color: ACCENT, fontSize: 18,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: `3px solid ${ACCENT}33`, borderTop: `3px solid ${ACCENT}`,
            animation: 'spin 0.8s linear infinite',
          }} />
          Loading map…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Language Switcher */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center',
        background: 'rgba(15,22,40,0.93)', borderRadius: 40,
        padding: '6px 10px', backdropFilter: 'blur(14px)',
        border: `1px solid ${ACCENT}44`, maxWidth: 'calc(100vw - 32px)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
      }}>
        {LANGUAGES.map((lang) => {
          const isActive = activeLang.code === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => setActiveLang(lang)}
              title={lang.name}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 13,
                fontWeight: 600, border: 'none', cursor: 'pointer',
                background: isActive ? ACCENT : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                transition: 'all 0.2s', fontFamily: 'inherit',
                boxShadow: isActive ? `0 0 12px ${ACCENT}66` : 'none',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {lang.native}
            </button>
          );
        })}
      </div>

      {/* Language indicator badge (shows under the switcher when non-English) */}
      {activeLang.code !== 'en' && styleLoaded && (
        <div style={{
          position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, background: `${ACCENT}22`, border: `1px solid ${ACCENT}55`,
          borderRadius: 20, padding: '4px 14px', fontSize: 12,
          color: ACCENT, backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
          fontWeight: 600,
        }}>
          ✓ All map labels switched to {activeLang.name} ({activeLang.native})
        </div>
      )}

      {/* Search Bar */}
      <div style={{
        position: 'absolute', top: activeLang.code !== 'en' ? 110 : 72,
        left: 16, zIndex: 10, width: 330, maxWidth: 'calc(100vw - 32px)',
        transition: 'top 0.3s',
      }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeLang.placeholder}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 12,
              border: `1.5px solid ${ACCENT}44`,
              background: 'rgba(15,22,40,0.93)', color: '#fff',
              fontSize: 14, outline: 'none', backdropFilter: 'blur(10px)',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT)}
            onBlur={(e) => (e.currentTarget.style.borderColor = `${ACCENT}44`)}
          />
          <button
            type="submit"
            disabled={searching}
            style={{
              padding: '10px 14px', background: ACCENT, border: 'none',
              borderRadius: 12, color: '#fff', cursor: 'pointer', fontSize: 16,
            }}
          >
            {searching ? '⏳' : '🔍'}
          </button>
        </form>

        {/* Dropdown results */}
        {searchResults.length > 0 && (
          <div style={{
            marginTop: 6, background: 'rgba(15,22,40,0.97)',
            border: `1px solid ${ACCENT}44`, borderRadius: 12,
            overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            {searchResults.map((r, i) => (
              <div
                key={i}
                onClick={() => flyToResult(r)}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  borderBottom: i < searchResults.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = `${ACCENT}22`)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', marginBottom: 2 }}>
                  {r.name || r.display_name.split(',')[0]}
                </div>
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.4)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {r.display_name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zoom + Location Controls */}
      <div style={{
        position: 'absolute', right: 16, bottom: 80, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {[
          { label: '+', title: 'Zoom In', action: () => mapRef.current?.zoomIn() },
          { label: '−', title: 'Zoom Out', action: () => mapRef.current?.zoomOut() },
          { label: locating ? '⏳' : '📍', title: activeLang.myLocation, action: handleMyLocation },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            title={btn.title}
            style={{
              width: 44, height: 44, borderRadius: 12,
              border: `1px solid ${ACCENT}44`, background: 'rgba(15,22,40,0.93)',
              color: '#fff', fontSize: btn.label === '+' || btn.label === '−' ? 22 : 18,
              cursor: 'pointer', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = ACCENT)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(15,22,40,0.93)')}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div style={{
        position: 'absolute', bottom: 16, left: 16, zIndex: 10,
        background: 'rgba(15,22,40,0.88)', border: `1px solid ${ACCENT}33`,
        borderRadius: 12, padding: '8px 14px', fontSize: 12,
        color: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column', gap: 4
      }}>
        <div>
          <span style={{ color: ACCENT, fontWeight: 700 }}>{activeLang.native}</span>
          {' · '}
          {activeLang.code === 'en'
            ? 'Showing English labels globally'
            : `All labels displaying in ${activeLang.name} · ${activeLang.attribution}`}
        </div>
        <div style={{ color: session ? '#22c55e' : '#f43f5e', fontWeight: 600 }}>
          {session ? `Translation Access Enabled (Logged in as ${session.user?.name || 'OSM User'}) - Click on any location to edit OSM.` : 'Login required to translate nodes'}
        </div>
      </div>
    </div>
  );
}
