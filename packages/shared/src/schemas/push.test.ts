import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isPushEndpoint } from './push.js';

describe('isPushEndpoint — chặn SSRF qua endpoint Web Push (FR-009.6)', () => {
  it('nhận dịch vụ push của các trình duyệt lớn', () => {
    assert.ok(isPushEndpoint('https://fcm.googleapis.com/fcm/send/abc'));
    assert.ok(isPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc'));
    assert.ok(isPushEndpoint('https://web.push.apple.com/QGx'));
    assert.ok(isPushEndpoint('https://wns2-par02p.notify.windows.com/w/?token=abc'));
  });

  it('chặn địa chỉ nội bộ, http, cổng lạ và tên miền giả', () => {
    assert.equal(isPushEndpoint('http://fcm.googleapis.com/x'), false);
    assert.equal(isPushEndpoint('https://localhost/x'), false);
    assert.equal(isPushEndpoint('https://169.254.169.254/latest/meta-data'), false);
    assert.equal(isPushEndpoint('https://fcm.googleapis.com:8443/x'), false);
    assert.equal(isPushEndpoint('https://fcm.googleapis.com.evil.com/x'), false);
    assert.equal(isPushEndpoint('https://evilnotify.windows.com.attacker.io/x'), false);
    assert.equal(isPushEndpoint('không phải url'), false);
  });
});
