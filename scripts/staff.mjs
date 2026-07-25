/**
 * Cria/atualiza um atendente da equipe (front /support).
 * Uso: npm run staff:add -- <email> <nome> <senha>
 * Lê DATABASE_URL do ambiente ou de .env.production / .env.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

function loadDbUrl() {
  if (process.env.DATABASE_URL) return;
  for (const f of [".env.production", ".env"]) {
    if (!existsSync(f)) continue;
    const line = readFileSync(f, "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    if (line) {
      process.env.DATABASE_URL = line
        .slice("DATABASE_URL=".length)
        .trim()
        .replace(/^["']|["']$/g, "");
      return;
    }
  }
}
loadDbUrl();

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const [email, name, password] = process.argv.slice(2);
if (!email || !name || !password) {
  console.error("Uso: npm run staff:add -- <email> <nome> <senha>");
  process.exit(1);
}

const prisma = new PrismaClient();
const e = email.trim().toLowerCase();
const user = await prisma.staffUser.upsert({
  where: { email: e },
  create: { email: e, name, passwordHash: hashPassword(password) },
  update: { name, passwordHash: hashPassword(password) },
});
console.log(`✔ Atendente pronto: ${user.email} (${user.name})`);
await prisma.$disconnect();
