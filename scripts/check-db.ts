import { prisma } from "../lib/prisma";

async function main() {
  await prisma.$queryRaw`SELECT 1 AS ok`;
  const users = await prisma.user.count();
  console.log("Connected to Neon Postgres successfully.");
  console.log(`User table ready. Current row count: ${users}`);
}

main()
  .catch((error) => {
    console.error("Database connection failed:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
