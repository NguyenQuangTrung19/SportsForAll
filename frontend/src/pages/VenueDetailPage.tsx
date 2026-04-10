import { Link, Navigate, useParams } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { appMenuItems } from '../config/appMenu'
import { venues } from '../data/venues'
import './VenueDetailPage.css'

function VenueDetailPage() {
  const { venueId } = useParams<{ venueId: string }>()
  const venue = venues.find((item) => item.id === venueId)

  if (!venue) {
    return <Navigate to="/venues" replace />
  }

  return (
    <AppShell menuItems={appMenuItems}>
      <section className="venue-detail-page">
        <header className="venue-detail-hero">
          <img src={venue.imageUrl} alt={venue.name} className="venue-detail-cover" />
          <div className="venue-detail-overlay" aria-hidden="true" />

          <div className="venue-detail-content">
            <p className="venue-detail-eyebrow">Chi tiết sân</p>
            <h1>{venue.name}</h1>
            <p>{venue.description}</p>

            <div className="venue-detail-badges">
              <span>{venue.area}</span>
              <span>{venue.openHours}</span>
              <span>{venue.priceRange}</span>
            </div>
          </div>

          <Link to="/venues" className="venue-back-link">
            ← Quay lại danh sách sân
          </Link>
        </header>

        <div className="venue-detail-grid">
          <article className="venue-detail-card">
            <h2>Thông tin sân</h2>
            <ul>
              <li>
                <strong>Địa chỉ:</strong> {venue.address}
              </li>
              <li>
                <strong>Số điện thoại:</strong> {venue.phone}
              </li>
              <li>
                <strong>Môn thể thao:</strong> {venue.sports.join(', ')}
              </li>
              <li>
                <strong>Khoảng cách:</strong> {venue.distanceKm.toFixed(1)} km
              </li>
              <li>
                <strong>Giờ mở cửa:</strong> {venue.openHours}
              </li>
              <li>
                <strong>Khung giá:</strong> {venue.priceRange}
              </li>
            </ul>
          </article>

          <article className="venue-detail-card">
            <h2>Đánh giá từ Google Maps</h2>
            <div className="google-rating">
              <p className="google-score">{venue.rating.toFixed(1)} / 5</p>
              <p className="google-stars" aria-label={`Đánh giá ${venue.rating.toFixed(1)} sao`}>
                {'★'.repeat(Math.round(venue.rating))}
                {'☆'.repeat(5 - Math.round(venue.rating))}
              </p>
              <p>{venue.totalReviews.toLocaleString('vi-VN')} lượt đánh giá</p>
              <a href={venue.googleMapsPlaceUrl} target="_blank" rel="noreferrer">
                Xem đánh giá chi tiết trên Google Maps
              </a>
            </div>
          </article>

          <article className="venue-detail-card">
            <h2>Tiện ích nổi bật</h2>
            <div className="amenity-list">
              {venue.amenities.map((amenity) => (
                <span key={amenity}>{amenity}</span>
              ))}
            </div>
          </article>

          <article className="venue-detail-card">
            <h2>Bản đồ & điều hướng</h2>
            <p>
              Bạn có thể mở Google Maps để xem chỉ đường, hình ảnh thực tế, giờ đông khách và review
              mới nhất của người chơi.
            </p>
            <div className="venue-detail-actions">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.mapQuery)}`}
                target="_blank"
                rel="noreferrer"
              >
                Mở chỉ đường trên Google Maps
              </a>
            </div>
          </article>
        </div>
      </section>
    </AppShell>
  )
}

export default VenueDetailPage
