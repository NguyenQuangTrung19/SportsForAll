import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cursorArgs, paginate } from './paginate.js';

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `id${i}` }));

describe('cursorArgs', () => {
  it('lấy dư đúng một bản ghi để biết còn trang sau', () => {
    assert.deepEqual(cursorArgs(20), { take: 21 });
  });

  it('bỏ qua chính bản ghi làm cursor', () => {
    assert.deepEqual(cursorArgs(20, 'abc'), { take: 21, cursor: { id: 'abc' }, skip: 1 });
  });

  it('cursor rỗng coi như không có — chuỗi rỗng gửi cursor undefined xuống Prisma sẽ nổ', () => {
    assert.deepEqual(cursorArgs(20, ''), { take: 21 });
  });
});

describe('paginate', () => {
  it('đủ một trang và còn nữa: cắt về limit, trả cursor là bản ghi cuối', () => {
    const { items, nextCursor } = paginate(rows(21), 20);
    assert.equal(items.length, 20);
    assert.equal(nextCursor, 'id19');
  });

  it('vừa đúng limit là hết dữ liệu — đây là chỗ dễ lệch một đơn vị nhất', () => {
    const { items, nextCursor } = paginate(rows(20), 20);
    assert.equal(items.length, 20);
    assert.equal(nextCursor, null);
  });

  it('chưa đầy một trang', () => {
    const { items, nextCursor } = paginate(rows(3), 20);
    assert.equal(items.length, 3);
    assert.equal(nextCursor, null);
  });

  it('không có gì', () => {
    assert.deepEqual(paginate([], 20), { items: [], nextCursor: null });
  });

  it('limit 1: vẫn phân biệt được "còn nữa" với "hết"', () => {
    assert.equal(paginate(rows(2), 1).nextCursor, 'id0');
    assert.equal(paginate(rows(1), 1).nextCursor, null);
  });

  it('không đụng vào mảng gốc', () => {
    const original = rows(21);
    paginate(original, 20);
    assert.equal(original.length, 21);
  });
});
