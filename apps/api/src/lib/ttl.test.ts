import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ttlToDate, ttlToMs } from './ttl.js';

describe('ttlToMs', () => {
  it('đủ bốn đơn vị', () => {
    assert.equal(ttlToMs('30s'), 30_000);
    assert.equal(ttlToMs('15m'), 900_000);
    assert.equal(ttlToMs('2h'), 7_200_000);
    assert.equal(ttlToMs('30d'), 2_592_000_000);
  });

  it('giá trị mặc định trong config chạy được', () => {
    assert.equal(ttlToMs('15m'), 15 * 60_000);
    assert.equal(ttlToMs('30d'), 30 * 86_400_000);
  });

  it('số 0 hợp lệ về cú pháp', () => {
    assert.equal(ttlToMs('0s'), 0);
  });

  it('ném lỗi thay vì lặng lẽ dùng mặc định — TTL sai mà vẫn khởi động được là phiên sai âm thầm', () => {
    for (const bad of ['', '15', 'm', '15w', '-5m', '1.5h', '15 m', 'MMM', '15M']) {
      assert.throws(() => ttlToMs(bad), /Invalid TTL/, `"${bad}" phải bị từ chối`);
    }
  });
});

describe('ttlToDate', () => {
  it('cộng vào mốc thời gian truyền vào', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    assert.equal(ttlToDate('1d', from).toISOString(), '2026-01-02T00:00:00.000Z');
  });

  it('không đụng vào mốc gốc', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    ttlToDate('30d', from);
    assert.equal(from.toISOString(), '2026-01-01T00:00:00.000Z');
  });

  it('mặc định tính từ bây giờ', () => {
    const before = Date.now();
    const result = ttlToDate('1h').getTime();
    assert.ok(result >= before + 3_600_000);
    assert.ok(result <= Date.now() + 3_600_000);
  });
});
