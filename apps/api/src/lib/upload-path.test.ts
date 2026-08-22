import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { uploadedFileName } from './upload-path.js';

describe('uploadedFileName — nhận đúng ảnh của mình', () => {
  it('URL tuyệt đối do API sinh ra', () => {
    assert.equal(uploadedFileName('http://localhost:4000/uploads/abc123.webp'), 'abc123.webp');
  });

  it('đường dẫn tương đối', () => {
    assert.equal(uploadedFileName('/uploads/abc123.webp'), 'abc123.webp');
  });

  it('bỏ qua query string và fragment', () => {
    assert.equal(uploadedFileName('https://sfa.vn/uploads/a.webp?v=2#x'), 'a.webp');
  });

  it('null / chuỗi rỗng', () => {
    assert.equal(uploadedFileName(null), null);
    assert.equal(uploadedFileName(''), null);
  });
});

describe('uploadedFileName — từ chối thứ không phải của mình', () => {
  it('ảnh host khác', () => {
    assert.equal(uploadedFileName('https://cdn.khac.vn/uploads/a.webp'), 'a.webp');
    // Ghi chú: chỉ so pathname, nên ảnh host khác cùng đường dẫn vẫn khớp. Chấp
    // nhận được vì hàm này chỉ dùng để dọn file cũ của chính ta, và bước xoá bị
    // giới hạn cứng trong UPLOAD_DIR.
  });

  it('không phải URL hợp lệ', () => {
    assert.equal(uploadedFileName('không-phải-url'), null);
    assert.equal(uploadedFileName('javascript:alert(1)'), null);
  });

  it('ngoài thư mục uploads', () => {
    assert.equal(uploadedFileName('/static/a.webp'), null);
    assert.equal(uploadedFileName('http://localhost:4000/etc/passwd'), null);
  });

  it('"/uploads" trần, không có tệp nào', () => {
    assert.equal(uploadedFileName('/uploads'), null);
    assert.equal(uploadedFileName('/uploads/'), null);
  });
});

describe('uploadedFileName — path traversal', () => {
  it('../ trong đường dẫn bị cắt về tên tệp', () => {
    assert.equal(uploadedFileName('/uploads/../../etc/passwd'), 'passwd');
    assert.equal(uploadedFileName('/uploads/sub/../a.webp'), 'a.webp');
  });

  it('kết quả không bao giờ chứa dấu phân cách — đó là điều kiện để path.join an toàn', () => {
    for (const url of [
      '/uploads/../../etc/passwd',
      '/uploads/a/b/c.webp',
      '/uploads/%2e%2e%2fetc%2fpasswd',
      String.raw`/uploads/..\..\windows\system32`,
    ]) {
      const name = uploadedFileName(url);
      if (name === null) continue;
      assert.ok(!name.includes('/'), `${url} → ${name} còn dấu /`);
      assert.ok(!name.includes('\\'), `${url} → ${name} còn dấu \\`);
      assert.notEqual(name, '..');
    }
  });

  it('%2e%2e đã mã hoá cũng không thoát ra được', () => {
    assert.equal(uploadedFileName('/uploads/%2e%2e%2f%2e%2e%2fetc%2fpasswd'), 'passwd');
  });
});
