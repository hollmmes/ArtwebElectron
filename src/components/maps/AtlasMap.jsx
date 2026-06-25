import { useEffect, useState, useMemo } from 'react'
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { GOOGLE_MAPS_API_KEY } from '../../config'
import { categoryColor } from './categoryColor'

// Zoom seviyesine göre grid hücre boyutu (derece). Düşük zoom = büyük hücre.
function cellSizeForZoom(zoom) {
  if (zoom >= 14) return 0.004
  if (zoom >= 12) return 0.02
  if (zoom >= 10) return 0.08
  if (zoom >= 8) return 0.3
  if (zoom >= 6) return 0.8
  return 1.6
}

function ClusterLayer({ businesses, getCategory, selectedBusiness, onSelectBusiness }) {
  const map = useMap()
  const [zoom, setZoom] = useState(6)
  const [bounds, setBounds] = useState(null)
  const [openInfo, setOpenInfo] = useState(null)

  useEffect(() => {
    if (!map) return
    const update = () => {
      setZoom(map.getZoom() ?? 6)
      setBounds(map.getBounds() ?? null)
    }
    update()
    const l1 = map.addListener('idle', update)
    return () => l1.remove()
  }, [map])

  const valid = useMemo(
    () => businesses.filter(b => typeof b.latitude === 'number' && typeof b.longitude === 'number'),
    [businesses]
  )

  // Görünür alandaki işletmeleri grid hücrelerine kümele
  const { clusters, singles } = useMemo(() => {
    const cell = cellSizeForZoom(zoom)
    const buckets = new Map()

    for (const b of valid) {
      if (bounds && !bounds.contains({ lat: b.latitude, lng: b.longitude })) continue
      const gx = Math.floor(b.longitude / cell)
      const gy = Math.floor(b.latitude / cell)
      const key = `${gx}_${gy}`
      let bucket = buckets.get(key)
      if (!bucket) {
        bucket = { items: [], sumLat: 0, sumLng: 0 }
        buckets.set(key, bucket)
      }
      bucket.items.push(b)
      bucket.sumLat += b.latitude
      bucket.sumLng += b.longitude
    }

    const clusters = []
    const singles = []
    for (const bucket of buckets.values()) {
      if (bucket.items.length === 1) {
        singles.push(bucket.items[0])
      } else {
        clusters.push({
          count: bucket.items.length,
          lat: bucket.sumLat / bucket.items.length,
          lng: bucket.sumLng / bucket.items.length,
          items: bucket.items,
        })
      }
    }
    return { clusters, singles }
  }, [valid, zoom, bounds])

  const zoomToCluster = (c) => {
    if (!map) return
    const b = new window.google.maps.LatLngBounds()
    c.items.forEach(it => b.extend({ lat: it.latitude, lng: it.longitude }))
    map.fitBounds(b, 80)
  }

  const clusterSize = (count) => {
    if (count >= 100) return 56
    if (count >= 50) return 48
    if (count >= 20) return 42
    if (count >= 10) return 36
    return 30
  }

  return (
    <>
      {clusters.map((c, i) => {
        const size = clusterSize(c.count)
        return (
          <AdvancedMarker
            key={`c-${i}`}
            position={{ lat: c.lat, lng: c.lng }}
            onClick={() => zoomToCluster(c)}
            zIndex={1000}
          >
            <div
              style={{
                width: size, height: size, borderRadius: '50%',
                background: 'rgba(37, 99, 235, 0.85)',
                border: '3px solid rgba(255,255,255,0.9)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: size >= 42 ? 14 : 12, fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: 'pointer',
                fontFamily: 'sans-serif',
              }}
            >
              {c.count}
            </div>
          </AdvancedMarker>
        )
      })}

      {singles.map((biz, i) => {
        const isSelected = selectedBusiness === biz
        const color = categoryColor(getCategory(biz))
        return (
          <AdvancedMarker
            key={`s-${biz.id ?? i}`}
            position={{ lat: biz.latitude, lng: biz.longitude }}
            onClick={() => { onSelectBusiness?.(biz); setOpenInfo(biz) }}
            zIndex={isSelected ? 999 : undefined}
          >
            <Pin
              background={color}
              borderColor="#ffffff"
              glyphColor="#ffffff"
              scale={isSelected ? 1.4 : 1}
            />
          </AdvancedMarker>
        )
      })}

      {openInfo && (
        <InfoWindow
          position={{ lat: openInfo.latitude, lng: openInfo.longitude }}
          onCloseClick={() => setOpenInfo(null)}
          pixelOffset={[0, -40]}
        >
          <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.6, maxWidth: 240 }}>
            <strong style={{ fontSize: 14, display: 'block', marginBottom: 2 }}>{openInfo.name}</strong>
            {getCategory(openInfo) && (
              <div style={{ color: '#64748b', fontSize: 12 }}>{getCategory(openInfo)}</div>
            )}
            {openInfo.address && <div style={{ marginTop: 4 }}>{openInfo.address}</div>}
            {openInfo.phone && <div>📞 {openInfo.phone}</div>}
            {openInfo.rating && (
              <div>⭐ {openInfo.rating}{openInfo.reviews_count ? ` (${openInfo.reviews_count} yorum)` : ''}</div>
            )}
            {openInfo.website && (
              <div style={{ marginTop: 2 }}>
                <a href={openInfo.website} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                  {openInfo.website.replace(/^https?:\/\//, '').slice(0, 30)}
                </a>
              </div>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  )
}

// Dışarıdan tek bir işletmeye odaklanma isteğini haritaya uygular
function FocusController({ focusTarget }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !focusTarget) return
    if (typeof focusTarget.latitude !== 'number' || typeof focusTarget.longitude !== 'number') return
    map.panTo({ lat: focusTarget.latitude, lng: focusTarget.longitude })
    map.setZoom(16)
  }, [focusTarget, map])
  return null
}

// Sade harita: POI/işyeri/transit etiketlerini gizler, kalabalığı azaltır
const MINIMAL_MAP_STYLES = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.station', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
]

// styles'ı prop yerine setOptions ile uygular (mapId/colorScheme ile çakışmayı önler)
function StyleController() {
  const map = useMap()
  useEffect(() => {
    if (!map) return
    map.setOptions({ styles: MINIMAL_MAP_STYLES, clickableIcons: false })
  }, [map])
  return null
}

export default function AtlasMap({
  businesses, getCategory, selectedBusiness, onSelectBusiness, focusTarget, isDark,
}) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        defaultCenter={{ lat: 39.0, lng: 35.0 }}
        defaultZoom={6}
        gestureHandling="greedy"
        disableDefaultUI={false}
        style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
        colorScheme={isDark ? 'DARK' : 'LIGHT'}
      >
        <StyleController />
        <ClusterLayer
          businesses={businesses}
          getCategory={getCategory}
          selectedBusiness={selectedBusiness}
          onSelectBusiness={onSelectBusiness}
        />
        <FocusController focusTarget={focusTarget} />
      </GoogleMap>
    </APIProvider>
  )
}
