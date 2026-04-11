export type Venue = {
  id: string
  name: string
  area: string
  sports: string[]
  address: string
  distanceKm: number
  rating: number
  totalReviews: number
  openHours: string
  phone: string
  priceRange: string
  amenities: string[]
  description: string
  imageUrl: string
  mapQuery: string
  googleMapsPlaceUrl: string
}

export const areaOptions = ['Tất cả', 'Quận 7']

export const sportOptions = ['Tất cả', 'Bóng đá']

const streetNames = [
  'Nguyễn Thị Thập',
  'Huỳnh Tấn Phát',
  'Nguyễn Hữu Thọ',
  'Lâm Văn Bền',
  'Trần Xuân Soạn',
  'Nguyễn Lương Bằng',
  'Đào Trí',
  'Tân Mỹ',
  'Phạm Hữu Lầu',
  'Lê Văn Lương',
]

const wardNames = [
  'Tân Phú',
  'Tân Hưng',
  'Tân Kiểng',
  'Tân Thuận Đông',
  'Tân Thuận Tây',
  'Phú Mỹ',
  'Bình Thuận',
  'Phú Thuận',
  'Tân Quy',
  'Tân Phong',
]

const baseVenueNames = [
  'Sân Bóng Nam Sài Gòn',
  'Sân Bóng Phú Mỹ Arena',
  'Sân Bóng Cầu Ánh Sao',
  'Sân Bóng Tân Phong FC',
  'Sân Bóng Riverside 7',
  'Sân Bóng Đa Năng Quận 7',
  'Sân Bóng Sky Turf',
  'Sân Bóng Golden Goal',
  'Sân Bóng Victory Park',
  'Sân Bóng Dragon Field',
]

const imagePool = [
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1543357480-c60d400e2ef9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1570498839593-e565b39455fc?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1486286701208-1d58e9338013?auto=format&fit=crop&w=1200&q=80',
]

const amenityPool = [
  ['Bãi giữ xe', 'Đèn sân ban đêm', 'Nước uống', 'Phòng thay đồ'],
  ['Bãi giữ xe ô tô', 'Wifi miễn phí', 'Thuê áo bib', 'Khu ngồi chờ'],
  ['Mặt cỏ mới', 'Dịch vụ trọng tài', 'Nhà vệ sinh sạch', 'Căng tin'],
  ['Đèn LED chuẩn thi đấu', 'Cho thuê bóng', 'Tủ locker', 'Sân khởi động'],
  ['Bãi xe rộng', 'Khu rửa giày', 'Máy bán nước tự động', 'Chụp ảnh highlights'],
]

const openHoursPool = ['05:30 - 23:00', '06:00 - 22:30', '06:00 - 23:30', '05:00 - 22:00']

const priceRangePool = [
  '220.000đ - 480.000đ/giờ',
  '250.000đ - 520.000đ/giờ',
  '200.000đ - 450.000đ/giờ',
  '280.000đ - 580.000đ/giờ',
]

export const venues: Venue[] = Array.from({ length: 50 }, (_, index) => {
  const ordinal = index + 1
  const baseName = baseVenueNames[index % baseVenueNames.length]
  const street = streetNames[index % streetNames.length]
  const ward = wardNames[index % wardNames.length]
  const rating = Number((4.1 + (index % 9) * 0.1).toFixed(1))
  const distanceKm = Number((0.8 + (index % 20) * 0.35).toFixed(1))
  const totalReviews = 140 + index * 37
  const phoneSuffix = (100 + ordinal).toString().padStart(3, '0')

  const name = `${baseName} ${ordinal}`
  const address = `${50 + index} ${street}, P.${ward}, Quận 7, TP.HCM`
  const mapQuery = `${name}, Quận 7, TP.HCM`

  return {
    id: `venue-q7-${ordinal}`,
    name,
    area: 'Quận 7',
    sports: ['Bóng đá'],
    address,
    distanceKm,
    rating,
    totalReviews,
    openHours: openHoursPool[index % openHoursPool.length],
    phone: `09${(index % 8) + 1}7 55${phoneSuffix}`,
    priceRange: priceRangePool[index % priceRangePool.length],
    amenities: amenityPool[index % amenityPool.length],
    description:
      'Sân cỏ nhân tạo 5v5 và 7v7 tại Quận 7, phù hợp đá phủi sau giờ làm, giao hữu cuối tuần và tổ chức giải mini.',
    imageUrl: imagePool[index % imagePool.length],
    mapQuery,
    googleMapsPlaceUrl: `https://maps.google.com/?q=${encodeURIComponent(mapQuery)}`,
  }
})
