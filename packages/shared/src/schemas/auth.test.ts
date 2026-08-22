import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { changePasswordSchema, registerSchema } from './auth.js';

const base = { email: 'a@b.vn', password: 'Password123!', displayName: 'Nguyễn An' };

describe('registerSchema — loại tài khoản (FR-008.1)', () => {
  it('mặc định là người chơi', () => {
    assert.equal(registerSchema.parse(base).accountType, 'user');
  });

  it('chọn chủ sân được', () => {
    assert.equal(registerSchema.parse({ ...base, accountType: 'business' }).accountType, 'business');
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
