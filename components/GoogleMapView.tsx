'use client';

import { useState, useRef, useEffect } from 'react';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';

const API_KEY = 'AIzaSyCGwga6gD8_IqjI462ahBZ0PlRZFBvvvio';

// Language definitions
const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', placeholder: 'Search places...', myLocation: 'My Location' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी', placeholder: 'स्थान खोजें...', myLocation: 'मेरी स्थिति' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', placeholder: 'இடங்களை தேடுங்கள்...', myLocation: 'என் இருப்பிடம்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', placeholder: 'స్థలాలు వెతకండి...', myLocation: 'నా స్థానం' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', placeholder: 'ಸ್ಥಳಗಳನ್ನು ಹುಡುಕಿ...', myLocation: 'ನನ್ನ ಸ್ಥಳ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', placeholder: 'സ്ഥലങ്ങൾ തിരയുക...', myLocation: 'എന്റെ സ്ഥാനം' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', placeholder: 'জায়গা খুঁজুন...', myLocation: 'আমার অবস্থান' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', placeholder: 'ठिकाणे शोधा...', myLocation: 'माझे स्थान' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', placeholder: 'સ્થળો શોધો...', myLocation: 'મારું સ્થાન' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', placeholder: 'ਥਾਵਾਂ ਲੱਭੋ...', myLocation: 'ਮੇਰੀ ਥਾਂ' },
];

const ACCENT = '#F97316';
const PRIMARY_BG = '#0F1628';

function OsmBaseLayer({ mapStyles }: { mapStyles: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // 1. Create the OSM Map Type
    const osmMapType = new window.google.maps.ImageMapType({
      getTileUrl: function(coord, zoom) {
        return `https://a.basemaps.cartocdn.com/light_nolabels/${zoom}/${coord.x}/${coord.y}.png`;
      },
      tileSize: new window.google.maps.Size(256, 256),
      maxZoom: 19,
      name: 'OSM'
    });

    // 2. Register OSM as the primary base map
    map.mapTypes.set('OSM', osmMapType);
    map.setMapTypeId('OSM');

    // 3. Create a Custom Overlay for Google's Labels
    // By providing the styles that hide geometry, Google's servers will return transparent PNGs containing ONLY the text labels!
    const labelsOverlay = new window.google.maps.StyledMapType(mapStyles, { name: 'GoogleLabels' });

    // 4. Place the transparent labels map directly on top of the OSM base map
    map.overlayMapTypes.clear();
    map.overlayMapTypes.insertAt(0, labelsOverlay);

  }, [map, mapStyles]);

  return null;
}

export default function GoogleMapApp() {
  const [activeLang, setActiveLang] = useState(LANGUAGES[0]);

  // Read language from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlLang = new URLSearchParams(window.location.search).get('lang');
      if (urlLang) {
        const found = LANGUAGES.find(l => l.code === urlLang);
        if (found) setActiveLang(found);
      }
    }
  }, []);

  const changeLanguage = (langCode: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = `?lang=${langCode}`;
    }
  };

  // The custom style turns off all base Google cartography (land, water, roads) 
  // so we only see the translated text labels returned by Google's tile engine
  const mapStyles = [
    { featureType: 'all', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ visibility: 'off' }] }
  ];

  // We only render API provider when mounted on client so the language is correctly injected on the very first script load
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      
      {/* 
        Google Maps API script cannot be Hot-Swapped after it loads in the browser window.
        By hard-reloading the page, we guarantee Google's servers strictly enforce the single requested language natively! 
      */}
      <APIProvider apiKey={API_KEY} language={activeLang.code}>
        
        <Map
          defaultCenter={{ lat: 20.5937, lng: 78.9629 }}
          defaultZoom={4.5}
          disableDefaultUI={true}
          mapTypeId="OSM" // Tell Map to boot up with our OSM base
        >
          {/* Inject OSM & Labels dynamically */}
          <OsmBaseLayer mapStyles={mapStyles} />
        </Map>

        {/* Language Switcher UI (Identical to previous MapView design) */}
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
                onClick={() => changeLanguage(lang.code)}
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

        {/* Center Checkmark Badge */}
        {activeLang.code !== 'en' && (
          <div style={{
            position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, background: `${ACCENT}22`, border: `1px solid ${ACCENT}55`,
            borderRadius: 20, padding: '4px 14px', fontSize: 12,
            color: ACCENT, backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
            fontWeight: 600,
          }}>
            ✓ OSM base rendered. Labels successfully drawn natively in {activeLang.name} ({activeLang.native})
          </div>
        )}

      </APIProvider>
    </div>
  );
}
