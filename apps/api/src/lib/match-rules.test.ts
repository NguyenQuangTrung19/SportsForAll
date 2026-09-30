import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canEndMatch, hasBeenPlayed } from './match-rules.js';

const past = new Date('2020-01-01T00:00:00.000Z');
const future = new Date('2099-01-01T00:00:00.000Z');

describe('hasBeenPlayed — mốc mở phần đánh giá (FR-005.10)', () => {
  it('trận huỷ thì không bao giờ chấm được, kể cả đã đánh dấu xong', () => {
    assert.equal(hasBeenPlayed({ status: 'cancelled', scheduledAt: past }), false);
  });

  it('đánh dấu completed thì chấm được, kể cả chưa hẹn giờ', () => {
    assert.equal(hasBeenPlayed({ status: 'completed', scheduledAt: null }), true);
    assert.equal(hasBeenPlayed({ status: 'completed', scheduledAt: future }), true);
  });

  it('đã hẹn giờ và giờ đã trôi qua', () => {
    assert.equal(hasBeenPlayed({ status: 'scheduled', scheduledAt: past }), true);
  });

  it('đã hẹn giờ nhưng chưa tới', () => {
    assert.equal(hasBeenPlayed({ status: 'scheduled', scheduledAt: future }), false);
  });

  it('không hẹn giờ và chưa ai chốt tỉ số', () => {
    assert.equal(hasBeenPlayed({ status: 'scheduled', scheduledAt: null }), false);
  });
});

describe('canEndMatch — ai được chốt tỉ số (FR-007.6)', () => {
  it('chỉ trận đang scheduled', () => {
    assert.equal(canEndMatch({ status: 'completed', scheduledAt: past }), false);
    assert.equal(canEndMatch({ status: 'cancelled', scheduledAt: past }), false);
  });

  it('không chốt trước giờ đá', () => {
    assert.equal(canEndMatch({ status: 'scheduled', scheduledAt: future }), false);
    assert.equal(canEndMatch({ status: 'scheduled', scheduledAt: past }), true);
  });

  it('không hẹn giờ thì chốt lúc nào cũng được', () => {
    assert.equal(canEndMatch({ status: 'scheduled', scheduledAt: null }), true);
  });
});
