import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { playerReputation, teamReputation } from './reputation.js';

describe('playerReputation — uy tín cá nhân (FR-002.12)', () => {
  it('chưa trận nào được chấm thì là 0, giống quy ước của đội', () => {
    assert.equal(playerReputation([]), 0);
  });

  it('một phiếu cực đoan không kéo điểm ra tận cùng', () => {
    assert.equal(playerReputation([1]), 2.5);
    assert.equal(playerReputation([5]), 3.5);
  });

  it('chơi đều tay nhiều trận thì điểm tiến về trung bình thật', () => {
    const many = playerReputation(Array<number>(30).fill(5));
    assert.ok(many > 4.8 && many < 5);
    assert.ok(many > playerReputation([5, 5, 5]));
  });

  it('một trận xấu giữa nhiều trận tốt chỉ trừ ít', () => {
    assert.equal(playerReputation([5, 5, 5, 5, 5, 5, 1]), 4);
  });

  it('không bao giờ vượt khỏi thang 1–5', () => {
    for (const scores of [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [5, 5, 5, 5, 5, 5, 5, 5],
    ]) {
      const r = playerReputation(scores);
      assert.ok(r >= 1 && r <= 5);
    }
  });
});

describe('teamReputation — uy tín đội (FR-007.7)', () => {
  it('chưa trận nào thì là 0', () => {
    assert.equal(teamReputation([]), 0);
  });

  it('mỗi trận nặng như nhau, bất kể đối thủ có bao nhiêu người chấm', () => {
    assert.equal(teamReputation([5, 3]), 4);
  });
});
