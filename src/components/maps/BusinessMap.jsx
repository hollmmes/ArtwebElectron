import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
})

const highlightIcon = new L.Icon({
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'marker-selected',
})

// Nominatim'den ilçe/şehir polygon'unu çek
async function fetchBoundary(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=geojson&limit=1&polygon_geojson=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'tr' } })
    const data = await res.json()
    if (data.features && data.features.length > 0) {
      const geom = data.features[0].geometry
      if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
        return data.features[0]
      }
    }
  } catch {}
  return null
}

function BoundaryLayer({ selectedDistricts, selectedCity, isDark }) {
  const map = useMap()
  const layerRef = useRef(null)
  const prevKey = useRef('')

  useEffect(() => {
    const key = selectedDistricts.join(',') + '|' + selectedCity
    if (key === prevKey.current) return
    prevKey.current = key

    // Önceki layer'ı temizle
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }

    if (!selectedCity) return

    const queries = selectedDistricts.length > 0
      ? selectedDistricts.map(d => `${d}, ${selectedCity}, Türkiye`)
      : [`${selectedCity}, Türkiye`]

    Promise.all(queries.map(fetchBoundary)).then(features => {
      const valid = features.filter(Boolean)
      if (valid.length === 0) return

      const geojson = {
        type: 'FeatureCollection',
        features: valid,
      }

      const layer = L.geoJSON(geojson, {
        style: {
          color: '#3b82f6',
          weight: 2.5,
          opacity: 0.9,
          fillColor: '#3b82f6',
          fillOpacity: isDark ? 0.12 : 0.08,
        },
      })

      layer.addTo(map)
      layerRef.current = layer

      // Sınıra fit et (marker yoksa)
      try {
        map.fitBounds(layer.getBounds(), { padding: [30, 30], maxZoom: 13 })
      } catch {}
    })

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [selectedDistricts.join(','), selectedCity])

  return null
}

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

export default function BusinessMap({ businesses, cityCoord, selectedBusiness, onSelectBusiness, isDark, selectedCity, selectedDistricts }) {
  const defaultCenter = cityCoord ? [cityCoord.lat, cityCoord.lng] : [39.0, 35.0]
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

        <BoundaryLayer
          selectedDistricts={selectedDistricts || []}
          selectedCity={selectedCity || ''}
          isDark={isDark}
        />

        <MapFlyTo businesses={validBusinesses} cityCoord={cityCoord} />

        {validBusinesses.map((biz, i) => (
          <Marker
            key={i}
            position={[biz.latitude, biz.longitude]}
            icon={selectedBusiness === biz ? highlightIcon : undefined}
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
