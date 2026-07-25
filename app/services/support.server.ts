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

/** Só as mensagens do ticket ATUAL (posteriores ao último encerramento). */
export async function listMessages(shop: string) {
  const conv = await prisma.conversation.findUnique({ where: { shop } });
  const resetAt = conv?.resetAt ?? null;
  return prisma.supportMessage.findMany({
    where: { shop, ...(resetAt ? { createdAt: { gt: resetAt } } : {}) },
    orderBy: { createdAt: "asc" },
    include: {
      attachments: {
        select: { id: true, name: true, mime: true, size: true },
      },
    },
  });
}

/** Nº de mensagens do ticket atual (usado p/ detectar o 1º contato). */
export async function countMessagesSinceReset(shop: string) {
  const conv = await prisma.conversation.findUnique({ where: { shop } });
  const resetAt = conv?.resetAt ?? null;
  return prisma.supportMessage.count({
    where: { shop, ...(resetAt ? { createdAt: { gt: resetAt } } : {}) },
  });
}

export async function postMessage(input: {
  shop: string;
  sender: "merchant" | "staff";
  staffUserId?: string | null;
  automated?: boolean;
  body: string;
  attachmentIds?: string[];
}) {
  const now = new Date();
  const message = await prisma.supportMessage.create({
    data: {
      shop: input.shop,
      sender: input.sender,
      staffUserId: input.staffUserId ?? null,
      automated: input.automated ?? false,
      body: input.body,
      attachments: input.attachmentIds?.length
        ? { connect: input.attachmentIds.map((id) => ({ id })) }
        : undefined,
    },
    include: { attachments: true },
  });

  // Atualiza a conversa: lastMessageAt + marca como lido para quem enviou.
  // Uma mensagem do LOJISTA sempre reabre o ticket (status volta a "open").
  const reopen = input.sender === "merchant" ? { status: "open" } : {};
  await prisma.conversation.upsert({
    where: { shop: input.shop },
    create: {
      shop: input.shop,
      lastMessageAt: now,
      ...reopen,
      ...(input.sender === "merchant"
        ? { merchantLastReadAt: now }
        : { staffLastReadAt: now }),
    },
    update: {
      lastMessageAt: now,
      ...reopen,
      ...(input.sender === "merchant"
        ? { merchantLastReadAt: now }
        : { staffLastReadAt: now }),
    },
  });

  return message;
}

/** Encerra o ticket: mantém as mensagens no banco, mas zera a conversa ativa. */
export async function closeTicket(shop: string) {
  const now = new Date();
  await prisma.conversation.update({
    where: { shop },
    data: { status: "closed", resetAt: now, staffLastReadAt: now },
  });
}

export async function markRead(shop: string, who: "merchant" | "staff") {
  const field = who === "merchant" ? "merchantLastReadAt" : "staffLastReadAt";
  await prisma.conversation.upsert({
    where: { shop },
    create: { shop, [field]: new Date() },
    update: { [field]: new Date() },
  });
}

/** Nº de mensagens não lidas por um dos lados (só do ticket atual). */
async function unreadCount(shop: string, forWho: "merchant" | "staff") {
  const conv = await prisma.conversation.findUnique({ where: { shop } });
  const lastRead =
    forWho === "merchant" ? conv?.merchantLastReadAt : conv?.staffLastReadAt;
  // Conta só a partir do mais recente entre "última leitura" e "reset do ticket".
  const marks = [conv?.resetAt, lastRead]
    .filter(Boolean)
    .map((d) => (d as Date).getTime());
  const since = marks.length ? new Date(Math.max(...marks)) : undefined;
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

/** Situação do ticket atual da loja: waiting (aguardando) | active (em andamento) | closed. */
async function ticketState(c: {
  shop: string;
  status: string;
  resetAt: Date | null;
}): Promise<"waiting" | "active" | "closed"> {
  if (c.status === "closed") return "closed";
  const humanReplies = await prisma.supportMessage.count({
    where: {
      shop: c.shop,
      sender: "staff",
      automated: false,
      ...(c.resetAt ? { createdAt: { gt: c.resetAt } } : {}),
    },
  });
  return humanReplies > 0 ? "active" : "waiting";
}

/** Inbox da equipe: todas as conversas com preview + não-lidas + situação. */
export async function listConversations() {
  const convs = await prisma.conversation.findMany({
    orderBy: { lastMessageAt: "desc" },
  });
  return Promise.all(
    convs.map(async (c) => {
      // Preview só do ticket atual (posterior ao reset).
      const last = await prisma.supportMessage.findFirst({
        where: {
          shop: c.shop,
          ...(c.resetAt ? { createdAt: { gt: c.resetAt } } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
      const unread = await unreadCount(c.shop, "staff");
      return {
        shop: c.shop,
        status: c.status,
        state: await ticketState(c),
        lastMessageAt: c.lastMessageAt.toISOString(),
        preview: last ? last.body.slice(0, 80) : "",
        lastSender: last?.sender ?? null,
        unread,
      };
    }),
  );
}

/** Métricas de tickets para o topo do inbox da equipe. */
export async function getTicketMetrics() {
  const convs = await prisma.conversation.findMany();
  const states = await Promise.all(convs.map((c) => ticketState(c)));
  return {
    total: states.length,
    waiting: states.filter((s) => s === "waiting").length,
    active: states.filter((s) => s === "active").length,
    closed: states.filter((s) => s === "closed").length,
  };
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
