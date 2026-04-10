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

export const areaOptions = [
  'Tất cả',
  'Quận 1',
  'Quận 3',
  'Quận 7',
  'Bình Thạnh',
  'Thủ Đức',
  'Gò Vấp',
  'Phú Nhuận',
]

export const sportOptions = ['Tất cả', 'Bóng đá', 'Cầu lông', 'Pickleball', 'Bóng rổ', 'Tennis']

export const venues: Venue[] = [
  {
    id: 'venue-1',
    name: 'FitZone Arena',
    area: 'Quận 7',
    sports: ['Bóng đá', 'Bóng rổ'],
    address: '45 Nguyễn Lương Bằng, Quận 7, TP.HCM',
    distanceKm: 3.2,
    rating: 4.8,
    totalReviews: 1234,
    openHours: '06:00 - 23:00',
    phone: '0901 223 456',
    priceRange: '180.000đ - 450.000đ/giờ',
    amenities: ['Bãi giữ xe', 'Phòng thay đồ', 'Nước uống', 'Đèn thi đấu ban đêm'],
    description:
      'Cụm sân chất lượng cao phù hợp đá phủi và giao hữu, có khu khởi động và không gian nghỉ giữa hiệp.',
    imageUrl:
      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80',
    mapQuery: 'FitZone Arena Quan 7',
    googleMapsPlaceUrl: 'https://maps.google.com/?q=FitZone+Arena+Quan+7',
  },
  {
    id: 'venue-2',
    name: 'Riverside Court',
    area: 'Bình Thạnh',
    sports: ['Cầu lông', 'Tennis'],
    address: '120 Điện Biên Phủ, Bình Thạnh, TP.HCM',
    distanceKm: 4.6,
    rating: 4.7,
    totalReviews: 892,
    openHours: '05:30 - 22:30',
    phone: '0908 778 210',
    priceRange: '120.000đ - 300.000đ/giờ',
    amenities: ['Máy lạnh khu chờ', 'Thuê vợt', 'Căng tin', 'Wifi miễn phí'],
    description:
      'Sân cầu lông và tennis trong nhà, mặt sân đều, phù hợp chơi phong trào lẫn tập luyện nâng cao.',
    imageUrl:
      'https://images.unsplash.com/photo-1595435742656-5272d0b3fa8b?auto=format&fit=crop&w=1200&q=80',
    mapQuery: 'Riverside Court Binh Thanh',
    googleMapsPlaceUrl: 'https://maps.google.com/?q=Riverside+Court+Binh+Thanh',
  },
  {
    id: 'venue-3',
    name: 'Skyline Pickle Hub',
    area: 'Phú Nhuận',
    sports: ['Pickleball', 'Tennis'],
    address: '28 Trường Sa, Phú Nhuận, TP.HCM',
    distanceKm: 2.8,
    rating: 4.9,
    totalReviews: 645,
    openHours: '06:00 - 22:00',
    phone: '0933 112 889',
    priceRange: '150.000đ - 320.000đ/giờ',
    amenities: ['Sân chuẩn giải', 'Thuê bóng/vợt', 'HLV theo giờ', 'Locker cá nhân'],
    description:
      'Không gian năng động chuyên pickleball với mặt sân chống trượt và hệ thống chiếu sáng tối ưu.',
    imageUrl:
      'https://images.unsplash.com/photo-1542144582-1ba00456b5e3?auto=format&fit=crop&w=1200&q=80',
    mapQuery: 'Skyline Pickle Hub Phu Nhuan',
    googleMapsPlaceUrl: 'https://maps.google.com/?q=Skyline+Pickle+Hub+Phu+Nhuan',
  },
  {
    id: 'venue-4',
    name: 'Saigon Sports Complex',
    area: 'Thủ Đức',
    sports: ['Bóng đá', 'Cầu lông', 'Bóng rổ'],
    address: '88 Xa Lộ Hà Nội, Thủ Đức, TP.HCM',
    distanceKm: 7.5,
    rating: 4.6,
    totalReviews: 1750,
    openHours: '06:00 - 23:30',
    phone: '0912 564 005',
    priceRange: '140.000đ - 500.000đ/giờ',
    amenities: ['Cụm nhiều sân', 'Khu vệ sinh rộng', 'Bãi xe ô tô', 'Cửa hàng dụng cụ'],
    description:
      'Tổ hợp thể thao lớn, phù hợp tổ chức giải đấu nội bộ công ty hoặc giao hữu nhiều đội cùng lúc.',
    imageUrl:
      'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
    mapQuery: 'Saigon Sports Complex Thu Duc',
    googleMapsPlaceUrl: 'https://maps.google.com/?q=Saigon+Sports+Complex+Thu+Duc',
  },
  {
    id: 'venue-5',
    name: 'Victory Stadium',
    area: 'Gò Vấp',
    sports: ['Bóng đá'],
    address: '15 Lê Đức Thọ, Gò Vấp, TP.HCM',
    distanceKm: 6.1,
    rating: 4.5,
    totalReviews: 1038,
    openHours: '06:00 - 22:00',
    phone: '0981 444 909',
    priceRange: '200.000đ - 480.000đ/giờ',
    amenities: ['Sân cỏ nhân tạo mới', 'Áo bib thuê', 'Trọng tài cộng tác', 'Dịch vụ quay highlights'],
    description:
      'Sân bóng đá phủi đông người chơi, tổ chức kèo linh hoạt theo khung giờ và trình độ.',
    imageUrl:
      'https://images.unsplash.com/photo-1543357480-c60d400e2ef9?auto=format&fit=crop&w=1200&q=80',
    mapQuery: 'Victory Stadium Go Vap',
    googleMapsPlaceUrl: 'https://maps.google.com/?q=Victory+Stadium+Go+Vap',
  },
  {
    id: 'venue-6',
    name: 'Central Tennis Club',
    area: 'Quận 1',
    sports: ['Tennis'],
    address: '7 Nguyễn Du, Quận 1, TP.HCM',
    distanceKm: 1.9,
    rating: 4.7,
    totalReviews: 560,
    openHours: '05:00 - 21:30',
    phone: '0977 981 881',
    priceRange: '220.000đ - 520.000đ/giờ',
    amenities: ['Sân tiêu chuẩn quốc tế', 'Khu nghỉ VIP', 'Dịch vụ huấn luyện', 'Đặt sân online'],
    description:
      'Câu lạc bộ tennis trung tâm thành phố với dịch vụ đầy đủ, phù hợp luyện tập và thi đấu bán chuyên.',
    imageUrl:
      'https://images.unsplash.com/photo-1612534847738-b3ea2ac8fecc?auto=format&fit=crop&w=1200&q=80',
    mapQuery: 'Central Tennis Club Quan 1',
    googleMapsPlaceUrl: 'https://maps.google.com/?q=Central+Tennis+Club+Quan+1',
  },
]
