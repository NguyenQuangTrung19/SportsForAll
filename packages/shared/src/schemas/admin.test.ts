import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  adminPostListQuerySchema,
  adminReportListQuerySchema,
  adminResolveReportSchema,
  adminUpdateUserSchema,
  adminUserListQuerySchema,
} from './admin.js';

describe('adminUpdateUserSchema', () => {
  it('đổi một trong hai trường là đủ', () => {
    assert.equal(adminUpdateUserSchema.safeParse({ role: 'business' }).success, true);
    assert.equal(adminUpdateUserSchema.safeParse({ displayName: 'Tên mới' }).success, true);
  });

  it('body rỗng bị từ chối — PATCH không có gì để đổi vẫn ghi một dòng nhật ký vô nghĩa', () => {
    assert.equal(adminUpdateUserSchema.safeParse({}).success, false);
  });

  it('nâng lên admin được (khác với lúc tự đăng ký)', () => {
    assert.equal(adminUpdateUserSchema.safeParse({ role: 'admin' }).success, true);
  });
});

describe('adminResolveReportSchema', () => {
  it('chỉ nhận hai kết luận', () => {
    assert.equal(adminResolveReportSchema.safeParse({ status: 'reviewed' }).success, true);
    assert.equal(adminResolveReportSchema.safeParse({ status: 'dismissed' }).success, true);
  });

  it('"pending" không phải một kết luận', () => {
    assert.equal(adminResolveReportSchema.safeParse({ status: 'pending' }).success, false);
  });
});

describe('query mặc định của các danh sách quản trị', () => {
  it('người dùng: tất cả trạng thái, 20 dòng', () => {
    const q = adminUserListQuerySchema.parse({});
    assert.equal(q.status, 'all');
    assert.equal(q.limit, 20);
  });

  it('bài đăng: mặc định xem tin tuyển đang hiển thị', () => {
    const q = adminPostListQuerySchema.parse({});
    assert.equal(q.kind, 'recruitment');
    assert.equal(q.status, 'open');
  });

  it('báo cáo: mặc định chỉ hiện cái đang chờ — đó là việc admin mở trang để làm', () => {
    assert.equal(adminReportListQuerySchema.parse({}).status, 'pending');
  });

  it('loại bài đăng bịa ra bị từ chối', () => {
    assert.equal(adminPostListQuerySchema.safeParse({ kind: 'venue' }).success, false);
  });
});
