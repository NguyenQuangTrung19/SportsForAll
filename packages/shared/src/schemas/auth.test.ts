import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  changePasswordSchema,
  loginSchema,
  phoneVerifySchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.js';

const base = { email: 'a@b.vn', password: 'Password123!', displayName: 'Nguyễn An' };

describe('registerSchema — loại tài khoản (FR-008.1)', () => {
  it('mặc định là người chơi', () => {
    assert.equal(registerSchema.parse(base).accountType, 'user');
  });

  it('chọn chủ sân được', () => {
    assert.equal(
      registerSchema.parse({ ...base, accountType: 'business' }).accountType,
      'business',
    );
  });

  it('KHÔNG tự đăng ký thành admin được — đây là ranh giới quyền, không phải lỗi gõ nhầm', () => {
    assert.equal(registerSchema.safeParse({ ...base, accountType: 'admin' }).success, false);
  });

  it('vai trò bịa ra cũng bị từ chối', () => {
    assert.equal(registerSchema.safeParse({ ...base, accountType: 'superuser' }).success, false);
  });
});

describe('registerSchema — mật khẩu và email', () => {
  it('mật khẩu tối thiểu 8 ký tự', () => {
    assert.equal(registerSchema.safeParse({ ...base, password: '1234567' }).success, false);
    assert.equal(registerSchema.safeParse({ ...base, password: '12345678' }).success, true);
  });

  it('chặn trên 72 ký tự — argon2/bcrypt cắt phần thừa, để lọt là tạo ảo giác an toàn', () => {
    assert.equal(registerSchema.safeParse({ ...base, password: 'a'.repeat(72) }).success, true);
    assert.equal(registerSchema.safeParse({ ...base, password: 'a'.repeat(73) }).success, false);
  });

  it('email phải đúng dạng', () => {
    assert.equal(registerSchema.safeParse({ ...base, email: 'không-phải-email' }).success, false);
  });
});

describe('changePasswordSchema', () => {
  it('mật khẩu mới phải khác mật khẩu cũ', () => {
    const same = { currentPassword: 'Password123!', newPassword: 'Password123!' };
    assert.equal(changePasswordSchema.safeParse(same).success, false);
  });

  it('đổi sang mật khẩu khác thì được', () => {
    const ok = { currentPassword: 'Password123!', newPassword: 'Password456!' };
    assert.equal(changePasswordSchema.safeParse(ok).success, true);
  });
});

describe('phoneVerifySchema — OTP và số điện thoại (FR-001.2)', () => {
  const ok = { phone: '0912345678', code: '123456' };

  it('+84 và 0 là cùng một số — một tài khoản, không phải hai', () => {
    assert.equal(phoneVerifySchema.parse({ ...ok, phone: '+84912345678' }).phone, '0912345678');
    assert.equal(phoneVerifySchema.parse(ok).phone, '0912345678');
  });

  it('mã phải đúng 6 chữ số', () => {
    for (const code of ['12345', '1234567', 'abcdef', '12 456']) {
      assert.equal(phoneVerifySchema.safeParse({ ...ok, code }).success, false, code);
    }
  });

  it('không tự đăng ký thành admin bằng OTP được', () => {
    assert.equal(phoneVerifySchema.safeParse({ ...ok, accountType: 'admin' }).success, false);
  });
});

describe('resetPasswordSchema (FR-001.6)', () => {
  it('mật khẩu mới cùng luật với lúc đăng ký', () => {
    assert.equal(
      resetPasswordSchema.safeParse({ token: 't', newPassword: '1234567' }).success,
      false,
    );
    assert.equal(
      resetPasswordSchema.safeParse({ token: 't', newPassword: '12345678' }).success,
      true,
    );
  });

  it('thiếu mã thì từ chối', () => {
    assert.equal(
      resetPasswordSchema.safeParse({ token: '', newPassword: '12345678' }).success,
      false,
    );
  });
});

describe('loginSchema — email hoặc số điện thoại', () => {
  const ok = (identifier: string) =>
    loginSchema.safeParse({ identifier, password: 'x' }).success;

  it('nhận email', () => assert.equal(ok('a@b.vn'), true));
  it('nhận số 0x và +84', () => {
    assert.equal(ok('0912345678'), true);
    assert.equal(ok('+84912345678'), true);
  });
  it('từ chối thứ không phải email cũng không phải số', () => {
    for (const v of ['', 'abc', '091234', '12345678901']) assert.equal(ok(v), false, v);
  });
});
