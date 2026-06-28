import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const createIcon = (color) =>
  L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
    className: '',
  });

const UP_ICON = createIcon('#23a54a');
const DOWN_ICON = createIcon('#e30620');

function FitBounds({ sites }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (!fitted.current && sites.length > 0) {
      const coords = sites
        .filter((s) => s.coordY != null && s.coordX != null)
        .map((s) => [Number(s.coordY), Number(s.coordX)]);
      if (coords.length > 0) {
        map.fitBounds(coords, { padding: [40, 40] });
      }
      fitted.current = true;
    }
  }, [sites, map]);

  return null;
}

export default function MapComponent({ sites = [] }) {
  const [hoveredSite, setHoveredSite] = useState(null);

  return (
    <MapContainer
      center={[28.0339, 1.6596]}
      zoom={6}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds sites={sites} />
      {sites
        .filter((s) => s.coordY != null && s.coordX != null)
        .map((s) => {
          const pos = [Number(s.coordY), Number(s.coordX)];
          const rayon = Number(s.rayon_couverture) || 800;
          const isUp = s.statut === 'UP';
          return (
            <div key={s.id}>
              <Marker
                position={pos}
                icon={isUp ? UP_ICON : DOWN_ICON}
                eventHandlers={{
                  mouseover: () => setHoveredSite(s.id),
                  mouseout: () => setHoveredSite(null),
                }}
              >
                <Popup>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '12px', minWidth: '180px' }}>
                    <strong style={{ fontSize: '14px', color: '#151720' }}>{s.nom}</strong>
                    <div style={{ color: '#8c909b', margin: '4px 0' }}>{s.codeSite}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '6px 0' }}>
                      <span style={{
                        display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                        background: isUp ? '#23a54a' : '#e30620',
                      }} />
                      <span style={{ fontWeight: 600, color: isUp ? '#23a54a' : '#e30620' }}>
                        {isUp ? 'EN LIGNE' : 'HORS LIGNE'}
                      </span>
                    </div>
                    <div style={{ color: '#555861', fontSize: '11px', lineHeight: 1.6 }}>
                      {s.wilaya && <div>Wilaya : {s.wilaya}</div>}
                      {s.commune && <div>Commune : {s.commune}</div>}
                      {s.adresse && <div>{s.adresse}</div>}
                      {s.rayon_couverture && <div>Couverture : {rayon}m</div>}
                    </div>
                  </div>
                </Popup>
              </Marker>
              {hoveredSite === s.id && (
                <Circle
                  center={pos}
                  radius={rayon}
                  pathOptions={{
                    color: isUp ? '#23a54a' : '#e30620',
                    fillColor: isUp ? '#23a54a' : '#e30620',
                    fillOpacity: isUp ? 0.15 : 0.1,
                    weight: 1,
                    opacity: 0.5,
                  }}
                />
              )}
            </div>
          );
        })}
    </MapContainer>
  );
}
