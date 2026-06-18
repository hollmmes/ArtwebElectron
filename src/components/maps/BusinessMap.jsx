import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Leaflet'in varsayılan icon path sorunu — bundler ile kırılıyor
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

const selectedIcon = new L.Icon({
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'marker-selected',
})

function MapFlyTo({ businesses, cityCoord }) {
  const map = useMap()
  const prevCount = useRef(0)

  useEffect(() => {
    if (businesses.length > 0 && businesses.length !== prevCount.current) {
      prevCount.current = businesses.length
      const valid = businesses.filter(b => b.latitude && b.longitude)
      if (valid.length === 0) return
      if (valid.length === 1) {
        map.flyTo([valid[0].latitude, valid[0].longitude], 14, { animate: true, duration: 1 })
        return
      }
      const bounds = L.latLngBounds(valid.map(b => [b.latitude, b.longitude]))
      map.flyToBounds(bounds, { padding: [40, 40], animate: true, duration: 1 })
    }
  }, [businesses.length])

  useEffect(() => {
    if (cityCoord && businesses.length === 0) {
      map.flyTo([cityCoord.lat, cityCoord.lng], cityCoord.zoom, { animate: false })
    }
  }, [cityCoord])

  return null
}

export default function BusinessMap({ businesses, cityCoord, selectedBusiness, onSelectBusiness, isDark }) {
  const defaultCenter = cityCoord
    ? [cityCoord.lat, cityCoord.lng]
    : [39.0, 35.0]
  const defaultZoom = cityCoord ? cityCoord.zoom : 6

  const validBusinesses = businesses.filter(b => b.latitude && b.longitude)

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          }
        />

        <MapFlyTo businesses={validBusinesses} cityCoord={cityCoord} />

        {validBusinesses.map((biz, i) => (
          <Marker
            key={i}
            position={[biz.latitude, biz.longitude]}
            icon={selectedBusiness === biz ? selectedIcon : undefined}
            eventHandlers={{ click: () => onSelectBusiness(biz) }}
          >
            <Popup maxWidth={240}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.5 }}>
                <strong style={{ fontSize: 14 }}>{biz.name}</strong>
                {biz.category && <div style={{ color: '#64748b', fontSize: 12 }}>{biz.category}</div>}
                {biz.address && <div style={{ marginTop: 4 }}>{biz.address}</div>}
                {biz.phone && <div>📞 {biz.phone}</div>}
                {biz.rating && <div>⭐ {biz.rating}{biz.reviews_count ? ` (${biz.reviews_count} yorum)` : ''}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {validBusinesses.length < businesses.length && businesses.length > 0 && (
        <div className="absolute bottom-2 left-2 z-[1000] bg-black/60 text-white text-xs px-2 py-1 rounded">
          {validBusinesses.length}/{businesses.length} işletme haritada
        </div>
      )}
    </div>
  )
}
