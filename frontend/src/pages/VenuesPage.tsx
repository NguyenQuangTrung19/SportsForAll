import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { appMenuItems } from '../config/appMenu'
import { areaOptions, sportOptions, venues } from '../data/venues'
import './VenuesPage.css'

function VenuesPage() {
  const [selectedArea, setSelectedArea] = useState('Tất cả')
  const [selectedSport, setSelectedSport] = useState('Tất cả')

  const filteredVenues = useMemo(() => {
    const scored = venues
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

        return {
          ...venue,
          score,
        }
      })
      .sort((a, b) => b.score - a.score)

    return scored
  }, [selectedArea, selectedSport])

  const hasFilters = selectedArea !== 'Tất cả' || selectedSport !== 'Tất cả'

  return (
    <AppShell menuItems={appMenuItems}>
      <section className="venues-panel">
        <header className="venues-header">
          <div>
            <p className="venues-eyebrow">Sân chơi</p>
            <h1>Khám phá sân đẹp, xem chi tiết và đặt kèo nhanh</h1>
            <p>
              Chọn khu vực và môn thể thao, hệ thống sẽ ưu tiên đề xuất sân theo mức độ phù hợp,
              đánh giá, lượt review và khoảng cách.
            </p>
          </div>
        </header>

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

        <div className="venues-meta">
          <strong>{filteredVenues.length}</strong>
          <span>sân phù hợp {hasFilters ? 'theo bộ lọc của bạn' : 'trong khu vực phổ biến'}</span>
        </div>

        <div className="venues-grid">
          {filteredVenues.length === 0 ? (
            <article className="venue-card venue-empty">
              <h3>Chưa có sân phù hợp</h3>
              <p>Thử chọn khu vực khác hoặc đổi môn thể thao để mở rộng kết quả.</p>
            </article>
          ) : (
            filteredVenues.map((venue, index) => (
              <Link key={venue.id} to={`/venues/${venue.id}`} className="venue-card-link">
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
              </Link>
            ))
          )}
        </div>
      </section>
    </AppShell>
  )
}

export default VenuesPage
