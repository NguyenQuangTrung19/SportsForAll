/**
 * Dữ liệu mẫu để dùng thử. Chạy: pnpm --filter @sfa/api db:seed
 * Idempotent — chạy lại nhiều lần không nhân bản dữ liệu.
 * Mọi tài khoản dùng chung mật khẩu DEMO_PASSWORD.
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from './lib/password.js';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo1234!';
const REGION = 'Hà Nội';
const SPORT = 'football';

const PEOPLE = [
  { email: 'an@demo.vn', displayName: 'Nguyễn Văn An', bio: 'Tiền vệ trung tâm, chơi 5 năm.' },
  { email: 'binh@demo.vn', displayName: 'Trần Thị Bình', bio: 'Thủ môn, thích đá tối thứ 4.' },
  { email: 'cuong@demo.vn', displayName: 'Lê Cường', bio: 'Trung vệ, cao 1m80.' },
  { email: 'dung@demo.vn', displayName: 'Phạm Dũng', bio: 'Tiền đạo cắm.' },
];

async function main() {
  // Dọn bản ghi seed đời cũ (id dạng 'seed-...') — chúng không phải CUID hợp lệ
  // nên không dùng được làm cursor phân trang.
  await prisma.lookingForTeamPost.deleteMany({ where: { id: { startsWith: 'seed-' } } });
  await prisma.matchRequest.deleteMany({ where: { id: { startsWith: 'seed-' } } });
  await prisma.recruitmentPost.deleteMany({ where: { id: { startsWith: 'seed-' } } });
  await prisma.team.deleteMany({ where: { id: { startsWith: 'seed-' } } });

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const users = [];
  for (const p of PEOPLE) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash,
        displayName: p.displayName,
        bio: p.bio,
        region: REGION,
        birthYear: 1998,
        emailVerified: true,
        onboardedAt: new Date(),
        sportPreferences: {
          create: { sport: SPORT, skillLevel: 'intermediate', position: 'Tiền vệ' },
        },
      },
    });
    users.push(user);
  }

  // Tài khoản quản trị để thử trang quản lý ảnh trang giới thiệu.
  await prisma.user.upsert({
    where: { email: 'admin@demo.vn' },
    update: { role: 'admin' },
    create: {
      email: 'admin@demo.vn',
      passwordHash,
      displayName: 'Quản trị viên',
      role: 'admin',
      region: REGION,
      emailVerified: true,
      onboardedAt: new Date(),
    },
  });

  const [an, binh, cuong] = users;
  if (!an || !binh || !cuong) throw new Error('seed: thiếu user');

  // Hai đội cùng môn, cùng khu vực để tìm thấy nhau ở trang "Tìm đối thủ".
  const teamA = await prisma.team.upsert({
    where: { id: 'cseedteama000000000001' },
    update: {},
    create: {
      id: 'cseedteama000000000001',
      name: 'FC Ba Đình',
      sport: SPORT,
      region: REGION,
      skillLevel: 'intermediate',
      description: 'Đội phong trào, đá sân 7 tối thứ 3 và thứ 6.',
      members: {
        create: [
          { userId: an.id, role: 'captain' },
          { userId: binh.id, role: 'member' },
        ],
      },
    },
  });

  const teamB = await prisma.team.upsert({
    where: { id: 'cseedteamb000000000001' },
    update: {},
    create: {
      id: 'cseedteamb000000000001',
      name: 'Cầu Giấy United',
      sport: SPORT,
      region: REGION,
      skillLevel: 'amateur',
      description: 'Anh em công sở, đá sân 7 cuối tuần.',
      members: { create: [{ userId: cuong.id, role: 'captain' }] },
    },
  });

  // Bài tuyển thành viên -> hiện ở trang "Tìm đồng đội"
  await prisma.recruitmentPost.upsert({
    where: { id: 'cseedpost1000000000001' },
    update: {},
    create: {
      id: 'cseedpost1000000000001',
      teamId: teamA.id,
      sport: SPORT,
      region: REGION,
      positionNeeded: 'Tiền đạo',
      skillLevelMin: 'amateur',
      description: 'Cần một tiền đạo cắm đá tối thứ 6 hàng tuần. Ưu tiên ở gần Ba Đình.',
    },
  });

  // Kèo tìm đối -> hiện ở trang "Tìm đối thủ"
  await prisma.matchRequest.upsert({
    where: { id: 'cseedmatch000000000001' },
    update: {},
    create: {
      id: 'cseedmatch000000000001',
      teamId: teamB.id,
      sport: SPORT,
      region: REGION,
      venueName: 'Sân Cầu Giấy',
      preferredTime: new Date(Date.now() + 3 * 86_400_000),
      description: 'Tìm đối giao hữu sân 7, chiều Chủ nhật. Đội mình trình độ vừa phải.',
    },
  });

  // Bài "Tìm đội" của cá nhân (FR-006.7) — cũng để trang chủ có gì hiển thị.
  const seekers = [
    {
      id: 'cseedlft10000000000001',
      user: binh,
      position: 'Thủ môn',
      desc: 'Thủ môn rảnh tối thứ 3 và thứ 5, đang tìm đội đá sân 7 khu vực Ba Đình.',
    },
    {
      id: 'cseedlft20000000000001',
      user: cuong,
      position: 'Trung vệ',
      desc: 'Trung vệ cao 1m80, chơi được cả tiền vệ phòng ngự. Tìm đội đá cuối tuần.',
    },
    {
      id: 'cseedlft30000000000001',
      user: an,
      position: 'Tiền vệ',
      desc: 'Tiền vệ trung tâm 5 năm kinh nghiệm, muốn tìm thêm một đội đá giữa tuần.',
    },
  ];
  for (const s of seekers) {
    await prisma.lookingForTeamPost.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        userId: s.user.id,
        sport: SPORT,
        region: REGION,
        position: s.position,
        skillLevel: 'intermediate',
        description: s.desc,
      },
    });
  }

  // Tài khoản chủ sân + một sân có sẵn lịch, để thử luồng FR-008 mà không phải
  // tự dựng từ đầu mỗi lần reset CSDL.
  const owner = await prisma.user.upsert({
    where: { email: 'sanbong@demo.vn' },
    update: { role: 'business' },
    create: {
      email: 'sanbong@demo.vn',
      passwordHash,
      displayName: 'Sân Mỹ Đình',
      role: 'business',
      region: REGION,
      emailVerified: true,
      onboardedAt: new Date(),
    },
  });

  const venue = await prisma.venue.upsert({
    where: { id: 'cseedvenue0000000000001' },
    update: {},
    create: {
      id: 'cseedvenue0000000000001',
      ownerId: owner.id,
      name: 'Sân bóng Mỹ Đình A',
      sport: SPORT,
      address: 'Số 1 Lê Đức Thọ, Nam Từ Liêm, Hà Nội',
      region: REGION,
      description: 'Cỏ nhân tạo, có đèn, chỗ gửi xe miễn phí. Cho thuê áo bib và bóng.',
      pricePerHour: 300_000,
    },
  });

  // Ba khung tối trong ba ngày tới; khung đầu mở cho đội lẻ vào ghép (FR-008.7).
  const startOfTomorrow = new Date();
  startOfTomorrow.setHours(19, 0, 0, 0);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  for (let i = 0; i < 3; i += 1) {
    const startsAt = new Date(startOfTomorrow);
    startsAt.setDate(startsAt.getDate() + i);
    const endsAt = new Date(startsAt);
    endsAt.setHours(endsAt.getHours() + 2);

    await prisma.venueSlot.upsert({
      where: { id: `cseedslot${i}00000000000001` },
      update: {},
      create: {
        id: `cseedslot${i}00000000000001`,
        venueId: venue.id,
        startsAt,
        endsAt,
        price: 300_000,
        openForTeams: i === 0,
        note: i === 0 ? 'Còn thiếu một đội, ai vào ghép thì nhắn' : null,
      },
    });
  }

  console.log(
    `Seed xong: ${users.length} người dùng + 1 admin + 1 chủ sân, 2 đội, 1 bài tuyển, 1 kèo, ${seekers.length} bài tìm đội, 1 sân với 3 khung giờ.`,
  );
  console.log(`Đăng nhập thử: ${PEOPLE[0]!.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
