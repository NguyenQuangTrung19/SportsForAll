import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createBookingSchema,
  createSlotSchema,
  createVenueReviewSchema,
  createVenueSchema,
  venueListQuerySchema,
} from './venue.js';

const slot = (over: Record<string, unknown> = {}) => ({
  startsAt: '2099-01-01T10:00:00.000Z',
  endsAt: '2099-01-01T12:00:00.000Z',
  ...over,
});

describe('createSlotSchema — khung giờ', () => {
  it('khung hợp lệ, giá và ghi chú tuỳ chọn', () => {
    const parsed = createSlotSchema.parse(slot());
    assert.equal(parsed.openForTeams, false);
    assert.equal(parsed.price, undefined);
  });

  it('giờ kết thúc phải sau giờ bắt đầu', () => {
    assert.equal(
      createSlotSchema.safeParse(slot({ endsAt: '2099-01-01T09:00:00.000Z' })).success,
      false,
    );
  });

  it('bằng nhau cũng không hợp lệ — khung dài 0 phút là khung không tồn tại', () => {
    assert.equal(createSlotSchema.safeParse(slot({ endsAt: slot().startsAt })).success, false);
  });

  it('đòi datetime có múi giờ: "2099-01-01T10:00" không rõ giờ nào của ai', () => {
    assert.equal(createSlotSchema.safeParse(slot({ startsAt: '2099-01-01T10:00' })).success, false);
  });

  it('giá âm bị từ chối', () => {
    assert.equal(createSlotSchema.safeParse(slot({ price: -1 })).success, false);
  });

  it('chặn trên 50 triệu — một cú gõ thừa số 0 không được thành giá 9 chữ số', () => {
    assert.equal(createSlotSchema.safeParse(slot({ price: 50_000_000 })).success, true);
    assert.equal(createSlotSchema.safeParse(slot({ price: 50_000_001 })).success, false);
  });

  it('giá phải là số nguyên — VND không có phần lẻ', () => {
    assert.equal(createSlotSchema.safeParse(slot({ price: 100_000.5 })).success, false);
  });
});

describe('createVenueSchema — sân', () => {
  const base = {
    name: 'Sân Mỹ Đình',
    sport: 'football',
    address: 'Số 1 Lê Đức Thọ',
    pricePerHour: 300_000,
  };

  it('sân hợp lệ', () => {
    assert.equal(createVenueSchema.safeParse(base).success, true);
  });

  it('cắt khoảng trắng thừa hai đầu', () => {
    assert.equal(createVenueSchema.parse({ ...base, name: '  Sân A  ' }).name, 'Sân A');
  });

  it('tên và địa chỉ có độ dài tối thiểu', () => {
    assert.equal(createVenueSchema.safeParse({ ...base, name: 'A' }).success, false);
    assert.equal(createVenueSchema.safeParse({ ...base, address: 'abc' }).success, false);
  });

  it('tên toàn khoảng trắng không lọt qua được — trim chạy trước khi đo độ dài', () => {
    assert.equal(createVenueSchema.safeParse({ ...base, name: '     ' }).success, false);
  });

  it('giá miễn phí (0) hợp lệ, giá âm thì không', () => {
    assert.equal(createVenueSchema.safeParse({ ...base, pricePerHour: 0 }).success, true);
    assert.equal(createVenueSchema.safeParse({ ...base, pricePerHour: -1 }).success, false);
  });
});

describe('venueListQuerySchema — query string', () => {
  it('mặc định: 20 dòng, sắp theo điểm', () => {
    const parsed = venueListQuerySchema.parse({});
    assert.equal(parsed.limit, 20);
    assert.equal(parsed.sort, 'rating');
  });

  it('ép kiểu số từ chuỗi — query string luôn là chuỗi', () => {
    const parsed = venueListQuerySchema.parse({ limit: '5', priceMax: '400000' });
    assert.equal(parsed.limit, 5);
    assert.equal(parsed.priceMax, 400_000);
  });

  it('limit bị chặn trên ở 50 — không cho ai xin cả bảng trong một lượt', () => {
    assert.equal(venueListQuerySchema.safeParse({ limit: '50' }).success, true);
    assert.equal(venueListQuerySchema.safeParse({ limit: '51' }).success, false);
    assert.equal(venueListQuerySchema.safeParse({ limit: '0' }).success, false);
  });

  it('cursor phải là cuid, không phải chuỗi bất kỳ', () => {
    assert.equal(venueListQuerySchema.safeParse({ cursor: 'abc' }).success, false);
  });
});

describe('createVenueReviewSchema — đánh giá', () => {
  it('chỉ nhận 1..5 sao', () => {
    for (const score of [1, 2, 3, 4, 5]) {
      assert.equal(createVenueReviewSchema.safeParse({ score }).success, true);
    }
    for (const score of [0, 6, -1, 2.5]) {
      assert.equal(createVenueReviewSchema.safeParse({ score }).success, false, `${score}`);
    }
  });
});

describe('createBookingSchema — đơn đặt', () => {
  it('đặt cá nhân: không cần gì cả', () => {
    assert.equal(createBookingSchema.safeParse({}).success, true);
  });

  it('teamId phải là cuid', () => {
    assert.equal(createBookingSchema.safeParse({ teamId: 'không-phải-cuid' }).success, false);
  });
});
