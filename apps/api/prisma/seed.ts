import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Demo CA Firm",
      financialYear: "2025-26",
      plan: "pro",
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "super_admin" },
    update: {},
    create: { name: "super_admin", permissions: { "*": true } },
  });

  await prisma.role.upsert({
    where: { name: "auditor" },
    update: {},
    create: { name: "auditor", permissions: {} },
  });

  await prisma.role.upsert({
    where: { name: "accountant" },
    update: {},
    create: { name: "accountant", permissions: {} },
  });

  await prisma.role.upsert({
    where: { name: "staff" },
    update: {},
    create: { name: "staff", permissions: {} },
  });

  const passwordHash = await bcrypt.hash("admin@1234", 12);
  await prisma.user.upsert({
    where: { email: "admin@audithub.local" },
    update: {},
    create: {
      orgId: org.id,
      roleId: adminRole.id,
      name: "Admin",
      email: "admin@audithub.local",
      passwordHash,
    },
  });

  console.log("Seeded demo org + admin (admin@audithub.local / admin@1234)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
