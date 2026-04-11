import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { appMenuItems } from '../config/appMenu'
import { areaOptions, sportOptions, venues, type Venue } from '../data/venues'
import './VenuesPage.css'

type SearchMode = 'address' | 'coords'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

function scoreVenues(list: Venue[], selectedArea: string, selectedSport: string) {
  return list
    .filter((venue) => {
      const matchArea = selectedArea === 'Tất cả' || venue.area === selectedArea
      const matchSport = selectedSport === 'Tất cả' || venue.sports.includes(selectedSport)
      return matchArea && matchSport
    })
    .map((venue) => {
      const sportMatchBoost =
        selectedSport !== 'Tất cả' && venue.sports.includes(selectedSport) ? 1.2 : 0
      const areaMatchBoost = selectedArea !== 'Tất cả' && venue.area === selectedArea ? 1 : 0
      const distancePenalty = Math.min(venue.distanceKm * 0.25, 2.5)
      const score = venue.rating * 2 + sportMatchBoost + areaMatchBoost - distancePenalty

      return { ...venue, score }
    })
    .sort((a, b) => b.score - a.score)
}

function VenuesPage() {
  const [selectedArea, setSelectedArea] = useState('Tất cả')
  const [selectedSport, setSelectedSport] = useState('Tất cả')

  const [searchMode, setSearchMode] = useState<SearchMode>('address')
  const [manualAddress, setManualAddress] = useState('Quận 7, TP.HCM')
  const [latitude, setLatitude] = useState('10.7342')
  const [longitude, setLongitude] = useState('106.7216')

  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [googleVenues, setGoogleVenues] = useState<Venue[]>([])

  const usingGoogleData = googleVenues.length > 0

  const filteredVenues = useMemo(() => {
    if (usingGoogleData) {
      return googleVenues
    }

    return scoreVenues(venues, selectedArea, selectedSport)
  }, [googleVenues, selectedArea, selectedSport, usingGoogleData])

  const hasFilters = selectedArea !== 'Tất cả' || selectedSport !== 'Tất cả'

  async function handleSearchGoogle() {
    setIsLoadingGoogle(true)
    setGoogleError(null)

    try {
      const payload =
        searchMode === 'address'
          ? {
              mode: 'address',
              address: manualAddress.trim(),
              radiusMeters: 8000,
              limit: 20,
            }
          : {
              mode: 'coords',
              latitude: Number(latitude),
              longitude: Number(longitude),
              radiusMeters: 8000,
              limit: 20,
            }

      const response = await fetch(`${API_BASE_URL}/api/venues/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Không gọi được API Google Places')
      }

      setGoogleVenues(Array.isArray(data.venues) ? data.venues : [])
    } catch (error) {
      setGoogleError(error instanceof Error ? error.message : 'Đã có lỗi xảy ra')
      setGoogleVenues([])
    } finally {
      setIsLoadingGoogle(false)
    }
  }

  function handleUseDemoData() {
    setGoogleVenues([])
    setGoogleError(null)
  }

  return (
    <AppShell menuItems={appMenuItems}>
      <section className="venues-panel">
        <header className="venues-header">
          <div>
            <p className="venues-eyebrow">Sân chơi</p>
            <h1>Khám phá sân đẹp, xem chi tiết và đặt kèo nhanh</h1>
            <p>
              Bạn có thể nhập địa chỉ hoặc tọa độ thủ công để lấy dữ liệu sân bóng thực tế từ Google
              Maps, hoặc quay về dữ liệu demo.
            </p>
          </div>
        </header>

        <section className="venues-source-panel" aria-label="Nguồn dữ liệu sân chơi">
          <div className="source-row">
            <strong>Nguồn dữ liệu:</strong>
            <span>{usingGoogleData ? 'Google Maps API' : 'Dữ liệu demo nội bộ'}</span>
          </div>

          <div className="mode-toggle" role="radiogroup" aria-label="Chế độ nhập vị trí">
            <button
              type="button"
              className={searchMode === 'address' ? 'active' : ''}
              onClick={() => setSearchMode('address')}
            >
              Nhập địa chỉ
            </button>
            <button
              type="button"
              className={searchMode === 'coords' ? 'active' : ''}
              onClick={() => setSearchMode('coords')}
            >
              Nhập tọa độ
            </button>
          </div>

          {searchMode === 'address' ? (
            <label className="manual-input">
              Địa chỉ
              <input
                value={manualAddress}
                onChange={(event) => setManualAddress(event.target.value)}
                placeholder="Ví dụ: Quận 7, TP.HCM"
              />
            </label>
          ) : (
            <div className="coords-grid">
              <label className="manual-input">
                Latitude
                <input
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  placeholder="10.7342"
                />
              </label>
              <label className="manual-input">
                Longitude
                <input
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  placeholder="106.7216"
                />
              </label>
            </div>
          )}

          <div className="source-actions">
            <button type="button" onClick={handleSearchGoogle} disabled={isLoadingGoogle}>
              {isLoadingGoogle ? 'Đang tìm từ Google...' : 'Tìm sân từ Google Maps'}
            </button>
            <button type="button" className="secondary" onClick={handleUseDemoData}>
              Dùng dữ liệu demo
            </button>
          </div>

          {googleError ? <p className="source-error">{googleError}</p> : null}
        </section>

        {!usingGoogleData ? (
          <div className="venues-filters" aria-label="Bộ lọc sân chơi">
            <label>
              Khu vực
              <select value={selectedArea} onChange={(event) => setSelectedArea(event.target.value)}>
                {areaOptions.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Môn thể thao
              <select
                value={selectedSport}
                onChange={(event) => setSelectedSport(event.target.value)}
              >
                {sportOptions.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <div className="venues-meta">
          <strong>{filteredVenues.length}</strong>
          <span>
            sân phù hợp{' '}
            {usingGoogleData
              ? 'theo vị trí bạn nhập từ Google Maps'
              : hasFilters
                ? 'theo bộ lọc của bạn'
                : 'trong khu vực phổ biến'}
          </span>
        </div>

        <div className="venues-grid">
          {filteredVenues.length === 0 ? (
            <article className="venue-card venue-empty">
              <h3>Chưa có sân phù hợp</h3>
              <p>Thử chọn vị trí khác hoặc quay về dữ liệu demo để xem thêm kết quả.</p>
            </article>
          ) : (
            filteredVenues.map((venue, index) => {
              const content = (
                <article className="venue-card">
                  <div className="venue-image-wrap">
                    <img src={venue.imageUrl} alt={venue.name} className="venue-image" loading="lazy" />
                    {index === 0 ? <span className="best-tag">Phù hợp nhất</span> : null}
                  </div>

                  <div className="venue-content">
                    <div className="venue-head">
                      <h3>{venue.name}</h3>
                      <span className="rating">★ {venue.rating.toFixed(1)}</span>
                    </div>

                    <p className="venue-address">{venue.address}</p>

                    <div className="venue-chips">
                      {venue.sports.map((sport) => (
                        <span key={`${venue.id}-${sport}`}>{sport}</span>
                      ))}
                    </div>

                    <div className="venue-stats">
                      <p>
                        <strong>{venue.totalReviews.toLocaleString('vi-VN')}</strong> lượt đánh giá
                      </p>
                      <p>
                        <strong>{venue.distanceKm.toFixed(1)} km</strong> từ vị trí của bạn
                      </p>
                    </div>
                  </div>
                </article>
              )

              if (usingGoogleData) {
                return (
                  <a
                    key={venue.id}
                    href={venue.googleMapsPlaceUrl}
                    className="venue-card-link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {content}
                  </a>
                )
              }

              return (
                <Link key={venue.id} to={`/venues/${venue.id}`} className="venue-card-link">
                  {content}
                </Link>
              )
            })
          )}
        </div>
      </section>
    </AppShell>
  )
}

export default VenuesPage
