import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { z } from 'zod'

const app = express()
const PORT = Number(process.env.PORT || 4000)
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

app.use(cors())
app.use(express.json())

const SearchSchema = z
  .object({
    mode: z.enum(['address', 'coords']),
    address: z.string().trim().min(3).max(200).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radiusMeters: z.number().int().min(500).max(30000).default(8000),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'address' && !value.address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['address'],
        message: 'address is required when mode = address',
      })
    }

    if (value.mode === 'coords' && (value.latitude === undefined || value.longitude === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['latitude'],
        message: 'latitude and longitude are required when mode = coords',
      })
    }
  })

const fallbackImage =
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80'

function normalizeVenueFromPlace(place, index) {
  const name = place.displayName?.text || 'Sân bóng'
  const address = place.formattedAddress || 'Chưa có địa chỉ'

  return {
    id: place.id || `google-place-${index + 1}`,
    name,
    area: 'Kết quả Google Maps',
    sports: ['Bóng đá'],
    address,
    distanceKm: Number((0.8 + index * 0.4).toFixed(1)),
    rating: typeof place.rating === 'number' ? place.rating : 4.2,
    totalReviews: typeof place.userRatingCount === 'number' ? place.userRatingCount : 0,
    openHours: place.currentOpeningHours?.openNow ? 'Đang mở cửa' : 'Kiểm tra trên Google Maps',
    phone: place.nationalPhoneNumber || 'Xem trên Google Maps',
    priceRange: 'Liên hệ sân để biết giá',
    amenities: ['Bãi giữ xe', 'Đèn sân ban đêm'],
    description: 'Dữ liệu lấy từ Google Maps Places API.',
    imageUrl: fallbackImage,
    mapQuery: `${name}, ${address}`,
    googleMapsPlaceUrl:
      place.googleMapsUri ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${address}`)}`,
  }
}

app.get('/api/health', (_, res) => {
  res.json({ ok: true })
})

app.post('/api/venues/search', async (req, res) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured on backend',
    })
  }

  const parsed = SearchSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request payload',
      details: parsed.error.issues,
    })
  }

  const payload = parsed.data
  const queryText =
    payload.mode === 'address'
      ? `sân bóng đá gần ${payload.address}, TP.HCM`
      : `sân bóng đá gần ${payload.latitude}, ${payload.longitude}`

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.nationalPhoneNumber,places.currentOpeningHours',
      },
      body: JSON.stringify({
        textQuery: queryText,
        maxResultCount: payload.limit,
        languageCode: 'vi',
        regionCode: 'VN',
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return res.status(502).json({
        error: 'Google Places API request failed',
        status: response.status,
        details: errorBody,
      })
    }

    const data = await response.json()
    const places = Array.isArray(data.places) ? data.places : []

    const venues = places.map((place, index) => normalizeVenueFromPlace(place, index))

    return res.json({
      source: 'google',
      query: queryText,
      count: venues.length,
      venues,
    })
  } catch (error) {
    console.error('Error while searching venues:', error)
    return res.status(500).json({
      error: 'Unexpected server error while fetching Google Places data',
    })
  }
})

app.listen(PORT, () => {
  console.log(`Backend is running on http://localhost:${PORT}`)
})
