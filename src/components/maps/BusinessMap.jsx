import { useEffect, useRef, useState, useCallback } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps'
import { GOOGLE_MAPS_API_KEY } from '../../config'
import { cityCoords } from '../../data/cityCoords'

const DISTRICT_HIGHLIGHT_STYLE = {
  strokeColor: '#3b82f6',
  strokeOpacity: 0.85,
  strokeWeight: 2,
  fillColor: '#3b82f6',
  fillOpacity: 0.04,
}

function BoundaryLayer({ selectedDistricts, selectedCity }) {
  const map = useMap()
  const polygonsRef = useRef([])
  const prevKey = useRef('')

  useEffect(() => {
    if (!map) return
    const key = selectedDistricts.join(',') + '|' + selectedCity
    if (key === prevKey.current) return
    prevKey.current = key

    // Önceki polygon'ları temizle
    polygonsRef.current.forEach(p => p.setMap(null))
    polygonsRef.current = []

    if (!selectedCity) return

    // İl sorgusu: admin_level=4, ilçe sorgusu: admin_level=6
    const isDistrictQuery = selectedDistricts.length > 0
    const adminLevel = isDistrictQuery ? 6 : 4
    const queries = isDistrictQuery
      ? selectedDistricts.map(d => ({ q: `${d}, ${selectedCity}, Türkiye`, level: 6 }))
      : [{ q: `${selectedCity}, Türkiye`, level: 4 }]

    const bounds = new window.google.maps.LatLngBounds()
    let boundsExtended = false

    // İlin merkez koordinatının kuzeyine 0.55 derece (~60km) ötesine çıkan
    // noktaları keser — karasuları / deniz alanlarını poligon dışına atar
    const cityLat = cityCoords[selectedCity]?.lat ?? 39.0
    const maxAllowedLat = cityLat + 0.55

    function clipSeaCoords(ring) {
      return ring.map(([lng, lat]) => [lng, Math.min(lat, maxAllowedLat)])
    }

    Promise.all(queries.map(async ({ q, level }) => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=geojson&limit=5&polygon_geojson=1`
        const res = await fetch(url, { headers: { 'Accept-Language': 'tr' } })
        const data = await res.json()
        if (!data.features?.length) return null
        const match = data.features.find(f =>
          f.properties?.['admin_level'] == level &&
          (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
        ) || data.features.find(f =>
          f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
        )
        if (!match) return null
        return match.geometry
      } catch { return null }
    })).then(geoms => {
      geoms.filter(Boolean).forEach(geom => {
        const rings = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
        rings.forEach(ring => {
          const clipped = clipSeaCoords(ring[0])
          const path = clipped.map(([lng, lat]) => {
            const pt = { lat, lng }
            bounds.extend(pt)
            boundsExtended = true
            return pt
          })
          const polygon = new window.google.maps.Polygon({
            paths: path,
            ...DISTRICT_HIGHLIGHT_STYLE,
            map,
          })
          polygonsRef.current.push(polygon)
        })
      })
      if (boundsExtended && polygonsRef.current.length > 0) {
        map.fitBounds(bounds, 40)
      }
    })

    return () => {
      polygonsRef.current.forEach(p => p.setMap(null))
      polygonsRef.current = []
    }
  }, [map, selectedDistricts.join(','), selectedCity])

  return null
}

function MarkerLayer({ businesses, selectedBusiness, onSelectBusiness }) {
  const map = useMap()
  const [openInfo, setOpenInfo] = useState(null)
  const prevCount = useRef(0)

  useEffect(() => {
    if (!map || businesses.length === 0) return
    if (businesses.length === prevCount.current) return
    prevCount.current = businesses.length

    const valid = businesses.filter(b => b.latitude && b.longitude)
    if (valid.length === 0) return

    if (valid.length === 1) {
      map.panTo({ lat: valid[0].latitude, lng: valid[0].longitude })
      map.setZoom(15)
      return
    }
    const bounds = new window.google.maps.LatLngBounds()
    valid.forEach(b => bounds.extend({ lat: b.latitude, lng: b.longitude }))
    map.fitBounds(bounds, 60)
  }, [businesses.length, map])

  const validBusinesses = businesses.filter(b => b.latitude && b.longitude)

  return (
    <>
      {validBusinesses.map((biz, i) => {
        const isSelected = selectedBusiness === biz
        return (
          <AdvancedMarker
            key={i}
            position={{ lat: biz.latitude, lng: biz.longitude }}
            onClick={() => { onSelectBusiness(biz); setOpenInfo(biz) }}
          >
            <Pin
              background={isSelected ? '#1d4ed8' : '#3b82f6'}
              borderColor={isSelected ? '#1e40af' : '#2563eb'}
              glyphColor="#fff"
              scale={isSelected ? 1.3 : 1}
            />
          </AdvancedMarker>
        )
      })}

      {openInfo && openInfo.latitude && openInfo.longitude && (
        <InfoWindow
          position={{ lat: openInfo.latitude, lng: openInfo.longitude }}
          onCloseClick={() => setOpenInfo(null)}
          pixelOffset={[0, -40]}
        >
          <div style={{ fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.6, maxWidth: 220 }}>
            <strong style={{ fontSize: 14, display: 'block', marginBottom: 2 }}>{openInfo.name}</strong>
            {openInfo.category && <div style={{ color: '#64748b', fontSize: 12 }}>{openInfo.category}</div>}
            {openInfo.address && <div style={{ marginTop: 4 }}>{openInfo.address}</div>}
            {openInfo.phone && <div>📞 {openInfo.phone}</div>}
            {openInfo.rating && <div>⭐ {openInfo.rating}{openInfo.reviews_count ? ` (${openInfo.reviews_count} yorum)` : ''}</div>}
          </div>
        </InfoWindow>
      )}
    </>
  )
}

function MapController({ cityCoord, businesses }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !cityCoord || businesses.length > 0) return
    map.panTo({ lat: cityCoord.lat, lng: cityCoord.lng })
    map.setZoom(cityCoord.zoom)
  }, [cityCoord, map])

  return null
}

export default function BusinessMap({
  businesses, cityCoord, selectedBusiness, onSelectBusiness,
  isDark, selectedCity, selectedDistricts,
}) {
  const defaultCenter = cityCoord ? { lat: cityCoord.lat, lng: cityCoord.lng } : { lat: 39.0, lng: 35.0 }
  const defaultZoom = cityCoord ? cityCoord.zoom : 6

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
        mapId={isDark ? 'dark-map' : undefined}
        gestureHandling="greedy"
        disableDefaultUI={false}
        style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
        colorScheme={isDark ? 'DARK' : 'LIGHT'}
      >
        <MapController cityCoord={cityCoord} businesses={businesses} />
        <BoundaryLayer
          selectedDistricts={selectedDistricts || []}
          selectedCity={selectedCity || ''}
        />
        <MarkerLayer
          businesses={businesses}
          selectedBusiness={selectedBusiness}
          onSelectBusiness={onSelectBusiness}
        />
      </Map>
    </APIProvider>
  )
}
