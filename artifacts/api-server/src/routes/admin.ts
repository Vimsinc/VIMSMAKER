import { Router, type Request, type Response } from "express";
import { db, usersTable, generationsTable } from "@workspace/db";
import { sql, desc, count, gte } from "drizzle-orm";

const router = Router();

async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  if (!req.user?.email) {
    res.status(401).json({ error: "Não autenticado" });
    return false;
  }
  const [vibeUser] = await db
    .select({ isAdmin: usersTable.isAdmin })
    .from(usersTable)
    .where(sql`${usersTable.email} = ${req.user.email}`)
    .limit(1);
  if (!vibeUser?.isAdmin) {
    res.status(403).json({ error: "Acesso negado" });
    return false;
  }
  return true;
}

router.get("/stats", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const now = new Date();
  const last30 = new Date(now);
  last30.setDate(last30.getDate() - 30);
  const last7 = new Date(now);
  last7.setDate(last7.getDate() - 7);

  const [totalUsers] = await db
    .select({ count: count() })
    .from(usersTable);

  const [newUsersMonth] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(gte(usersTable.createdAt, last30));

  const [newUsersWeek] = await db
    .select({ count: count() })
    .from(usersTable)
    .where(gte(usersTable.createdAt, last7));

  const toolUsage = await db
    .select({
      type: generationsTable.type,
      total: count(),
    })
    .from(generationsTable)
    .groupBy(generationsTable.type)
    .orderBy(desc(count()));

  const imagesTotal = await db.execute<{ total: string }>(
    sql`SELECT COUNT(*) as total FROM images_history`
  );
  const videosTotal = await db.execute<{ total: string }>(
    sql`SELECT COUNT(*) as total FROM videos_history`
  );
  const publishingTotal = await db.execute<{ total: string }>(
    sql`SELECT COUNT(*) as total FROM publishing`
  );

  const recentUsers = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      plan: usersTable.plan,
      postsUsed: usersTable.postsUsed,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt))
    .limit(10);

  const newUsersTimeline = await db.execute<{ day: string; total: string }>(
    sql`
      SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*) AS total
      FROM vibe_users
      WHERE created_at >= ${last30}
      GROUP BY 1 ORDER BY 1
    `
  );

  const toolBreakdownAll = [
    ...toolUsage.map((t) => ({ tool: t.type, count: Number(t.total), source: "gerador" })),
    { tool: "imagem", count: Number((imagesTotal.rows[0] as { total: string }).total), source: "imagens" },
    { tool: "vídeo", count: Number((videosTotal.rows[0] as { total: string }).total), source: "vídeos" },
    { tool: "instagram", count: Number((publishingTotal.rows[0] as { total: string }).total), source: "publish" },
  ];

  const mostUsedTool = toolBreakdownAll.reduce(
    (best, cur) => (cur.count > best.count ? cur : best),
    { tool: "—", count: 0, source: "" }
  );

  res.json({
    users: {
      total: Number(totalUsers.count),
      newThisMonth: Number(newUsersMonth.count),
      newThisWeek: Number(newUsersWeek.count),
      recent: recentUsers,
      timeline: (newUsersTimeline.rows as { day: string; total: string }[]).map((r) => ({
        day: r.day,
        total: Number(r.total),
      })),
    },
    content: {
      generationsTotal: toolUsage.reduce((s, t) => s + Number(t.total), 0),
      imagesTotal: Number((imagesTotal.rows[0] as { total: string }).total),
      videosTotal: Number((videosTotal.rows[0] as { total: string }).total),
      publishingTotal: Number((publishingTotal.rows[0] as { total: string }).total),
      toolUsage: toolUsage.map((t) => ({ tool: t.type, count: Number(t.total) })),
      breakdown: toolBreakdownAll,
      mostUsed: mostUsedTool.tool,
    },
  });
});

router.get("/users", async (req: Request, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  const users = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  res.json(users);
});

export default router;
