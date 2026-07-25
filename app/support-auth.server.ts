/**
 * Auth da equipe de atendimento (front standalone /support/*), separada da Shopify.
 * Cookie de sessão próprio + hash de senha com scrypt (node:crypto, sem dependência).
 */
import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import prisma from "./db.server";

const SECRET =
  process.env.SUPPORT_SESSION_SECRET ||
  process.env.SHOPIFY_API_SECRET ||
  "dev-support-secret-change-me";

const storage = createCookieSessionStorage({
  cookie: {
    name: "__support_session",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/support",
    maxAge: 60 * 60 * 24 * 14, // 14 dias
    secrets: [SECRET],
  },
});

// ---- Senha (scrypt + salt) ----
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const ref = Buffer.from(hash, "hex");
  return test.length === ref.length && timingSafeEqual(test, ref);
}

// ---- Sessão ----
export type StaffUser = { id: string; email: string; name: string };

async function getSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getStaffUser(request: Request): Promise<StaffUser | null> {
  const session = await getSession(request);
  const userId = session.get("staffUserId");
  if (!userId) return null;
  const user = await prisma.staffUser.findUnique({
    where: { id: String(userId) },
    select: { id: true, email: true, name: true },
  });
  return user;
}

export async function requireStaff(request: Request): Promise<StaffUser> {
  const user = await getStaffUser(request);
  if (!user) {
    const url = new URL(request.url);
    throw redirect(`/support/login?next=${encodeURIComponent(url.pathname)}`);
  }
  return user;
}

export async function login(email: string, password: string): Promise<StaffUser | null> {
  const user = await prisma.staffUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export async function createStaffSession(userId: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set("staffUserId", userId);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await storage.commitSession(session) },
  });
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect("/support/login", {
    headers: { "Set-Cookie": await storage.destroySession(session) },
  });
}
