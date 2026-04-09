# SportsForAll - Agent Operating Contract

Tài liệu này bắt buộc cho mọi phiên làm việc AI trong dự án.

## 1) Mục tiêu

- Tránh dẫm chân giữa planning, coding, testing, security, deployment.
- Dùng nhất quán bộ skills đã chọn trong `.cursor/skills`.
- Mọi thay đổi phải đi theo pipeline cố định.

## 2) Pipeline bắt buộc (không bỏ qua)

1. **Plan**
  - Dùng tư duy từ `api-design`, `backend-patterns`, `frontend-patterns`.
2. **Implement**
  - Code theo `coding-standards`.
3. **Test**
  - Theo `tdd-workflow`, sau đó `e2e-testing` cho luồng quan trọng.
4. **Security pass**
  - Checklist từ `security-review` trước khi merge.
5. **Quality gate**
  - Chạy theo `verification-loop` trước khi chốt task.

## 3) Phân vai skills để tránh chồng chéo

- `api-design`: chuẩn endpoint, filter, pagination, error model.
- `backend-patterns`: service/repository, transaction, caching.
- `frontend-patterns`: UI state, data fetching, component boundaries.
- `design-system`: token màu/theme đa môn thể thao.
- `postgres-patterns`: index, query tuning, khóa nhất quán dữ liệu.
- `database-migrations`: migration an toàn, rollback rõ ràng.
- `docker-patterns`: local multi-service stack.
- `deployment-patterns`: CI/CD, health check, rollout.
- `tdd-workflow`: test-first cho feature/bugfix.
- `e2e-testing`: test luồng người dùng chính.
- `security-review`: input validation, authz/authn, secret hygiene.
- `verification-loop`: build/test/lint/typecheck/security trước khi hoàn tất.
- `documentation-lookup`: tra cứu docs chính thức khi API/framework thay đổi.
- `coding-standards`: chuẩn đặt tên, readability, maintainability.

## 4) Hook policy tối giản

Hooks chỉ để bảo vệ và cảnh báo quan trọng, không auto chạy tác vụ nặng:

- chặn lộ secrets trong prompt/file read,
- cảnh báo shell nguy hiểm,
- giữ stop hook nhẹ để ổn định.

## 5) Quy tắc thực thi

- Không thêm skill mới nếu chưa chỉ ra khoảng trống thực sự.
- Mỗi task phải nêu rõ đã đi qua các bước: Plan -> Implement -> Test -> Security -> Verify.
- Khi thay đổi schema DB: bắt buộc migration + rollback plan.
- Khi thêm endpoint: bắt buộc chuẩn hóa theo `api-design`.

## 6) Definition of Done cho mỗi task

- Có kế hoạch ngắn gọn.
- Có test phù hợp (unit/integration/e2e khi cần).
- Qua security checklist cơ bản.
- Qua verification loop.
- Không vi phạm hooks/rules hiện hành.

