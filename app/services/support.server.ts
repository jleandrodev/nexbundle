/**
 * Suporte / chat — conversa contínua por loja. Multi-tenant por `shop`.
 * Não-lidas derivadas comparando lastReadAt com createdAt das mensagens.
 */
import prisma from "../db.server";

export async function getOrCreateConversation(shop: string) {
  return prisma.conversation.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
}

export async function listMessages(shop: string) {
  return prisma.supportMessage.findMany({
    where: { shop },
    orderBy: { createdAt: "asc" },
    include: {
      attachments: {
        select: { id: true, name: true, mime: true, size: true },
      },
    },
  });
}

export async function postMessage(input: {
  shop: string;
  sender: "merchant" | "staff";
  staffUserId?: string | null;
  body: string;
  attachmentIds?: string[];
}) {
  const now = new Date();
  const message = await prisma.supportMessage.create({
    data: {
      shop: input.shop,
      sender: input.sender,
      staffUserId: input.staffUserId ?? null,
      body: input.body,
      attachments: input.attachmentIds?.length
        ? { connect: input.attachmentIds.map((id) => ({ id })) }
        : undefined,
    },
    include: { attachments: true },
  });

  // Atualiza a conversa: lastMessageAt + marca como lido para quem enviou.
  await prisma.conversation.upsert({
    where: { shop: input.shop },
    create: {
      shop: input.shop,
      lastMessageAt: now,
      ...(input.sender === "merchant"
        ? { merchantLastReadAt: now }
        : { staffLastReadAt: now }),
    },
    update: {
      lastMessageAt: now,
      ...(input.sender === "merchant"
        ? { merchantLastReadAt: now }
        : { staffLastReadAt: now }),
    },
  });

  return message;
}

export async function markRead(shop: string, who: "merchant" | "staff") {
  const field = who === "merchant" ? "merchantLastReadAt" : "staffLastReadAt";
  await prisma.conversation.upsert({
    where: { shop },
    create: { shop, [field]: new Date() },
    update: { [field]: new Date() },
  });
}

/** Nº de mensagens não lidas por um dos lados. */
async function unreadCount(shop: string, forWho: "merchant" | "staff") {
  const conv = await prisma.conversation.findUnique({ where: { shop } });
  const since =
    forWho === "merchant" ? conv?.merchantLastReadAt : conv?.staffLastReadAt;
  const otherSide = forWho === "merchant" ? "staff" : "merchant";
  return prisma.supportMessage.count({
    where: {
      shop,
      sender: otherSide,
      ...(since ? { createdAt: { gt: since } } : {}),
    },
  });
}

export const unreadForMerchant = (shop: string) => unreadCount(shop, "merchant");
export const unreadForStaff = (shop: string) => unreadCount(shop, "staff");

/** Inbox da equipe: todas as conversas com preview + não-lidas. */
export async function listConversations() {
  const convs = await prisma.conversation.findMany({
    orderBy: { lastMessageAt: "desc" },
  });
  return Promise.all(
    convs.map(async (c) => {
      const last = await prisma.supportMessage.findFirst({
        where: { shop: c.shop },
        orderBy: { createdAt: "desc" },
      });
      const unread = await unreadCount(c.shop, "staff");
      return {
        shop: c.shop,
        status: c.status,
        lastMessageAt: c.lastMessageAt.toISOString(),
        preview: last ? last.body.slice(0, 80) : "",
        lastSender: last?.sender ?? null,
        unread,
      };
    }),
  );
}

/** Total de conversas com mensagens não lidas pela equipe (badge global). */
export async function totalUnreadForStaff() {
  const convs = await listConversations();
  return convs.filter((c) => c.unread > 0).length;
}

// ---- Anexos (metadados; o arquivo em si é gravado no disco pela rota) ----
export async function createAttachment(input: {
  id?: string;
  shop: string;
  name: string;
  mime: string;
  size: number;
  path: string;
}) {
  return prisma.supportAttachment.create({ data: input });
}

export async function getAttachment(id: string) {
  return prisma.supportAttachment.findUnique({ where: { id } });
}
