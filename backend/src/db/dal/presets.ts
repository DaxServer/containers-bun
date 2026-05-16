import { db } from '@backend/db/client'
import { presets } from '@backend/db/schema'
import { and, count, desc, eq, like, or, sql } from 'drizzle-orm'

function presetFilter(filterText?: string) {
  if (!filterText) return undefined
  const p = `%${filterText}%`
  return or(
    like(sql`CAST(${presets.id} AS CHAR)`, p),
    like(presets.userid, p),
    like(presets.title, p),
  )
}

export async function getPresetsForHandler(
  userid: string,
  handler: string,
): Promise<(typeof presets.$inferSelect)[]> {
  return db
    .select()
    .from(presets)
    .where(and(eq(presets.userid, userid), eq(presets.handler, handler)))
    .orderBy(desc(presets.created_at))
}

export async function getAllPresets({
  offset = 0,
  limit = 100,
  filterText,
}: { offset?: number; limit?: number; filterText?: string } = {}): Promise<
  (typeof presets.$inferSelect)[]
> {
  return db
    .select()
    .from(presets)
    .where(presetFilter(filterText))
    .orderBy(desc(presets.created_at))
    .limit(limit)
    .offset(offset)
}

export async function countAllPresets({
  filterText,
}: { filterText?: string } = {}): Promise<number> {
  const [row] = await db
    .select({ n: count(presets.id) })
    .from(presets)
    .where(presetFilter(filterText))
  return row?.n ?? 0
}

export async function getDefaultPreset(
  userid: string,
  handler: string,
): Promise<typeof presets.$inferSelect | undefined> {
  return db.query.presets.findFirst({
    where: (p, { and, eq }) =>
      and(eq(p.userid, userid), eq(p.handler, handler), eq(p.is_default, true)),
  })
}

export async function createPreset({
  userid,
  handler,
  title,
  title_template,
  labels,
  categories,
  exclude_from_date_category = false,
  is_default = false,
}: {
  userid: string
  handler: string
  title: string
  title_template: string
  labels?: unknown
  categories?: string
  exclude_from_date_category?: boolean
  is_default?: boolean
}): Promise<typeof presets.$inferSelect | undefined> {
  if (is_default) {
    await db
      .update(presets)
      .set({ is_default: false })
      .where(
        and(eq(presets.userid, userid), eq(presets.handler, handler), eq(presets.is_default, true)),
      )
  }
  const result = await db.insert(presets).values({
    userid,
    handler,
    title,
    title_template,
    labels: labels ?? null,
    categories: categories ?? null,
    exclude_from_date_category,
    is_default,
  })
  const insertId = (result[0] as { insertId: number }).insertId
  return db.query.presets.findFirst({ where: (p, { eq }) => eq(p.id, insertId) })
}

export async function updatePreset(
  presetId: number,
  userid: string,
  updates: {
    title: string
    title_template: string
    labels?: unknown
    categories?: string
    exclude_from_date_category?: boolean
    is_default?: boolean
  },
): Promise<typeof presets.$inferSelect | null | undefined> {
  const existing = await db.query.presets.findFirst({
    where: (p, { and, eq }) => and(eq(p.id, presetId), eq(p.userid, userid)),
  })
  if (!existing) return null
  if (updates.is_default) {
    await db
      .update(presets)
      .set({ is_default: false })
      .where(
        and(
          eq(presets.userid, userid),
          eq(presets.handler, existing.handler),
          eq(presets.is_default, true),
          sql`${presets.id} != ${presetId}`,
        ),
      )
  }
  await db
    .update(presets)
    .set({
      title: updates.title,
      title_template: updates.title_template,
      labels: updates.labels ?? null,
      categories: updates.categories ?? null,
      exclude_from_date_category: updates.exclude_from_date_category ?? false,
      is_default: updates.is_default ?? false,
    })
    .where(eq(presets.id, presetId))
  return db.query.presets.findFirst({ where: (p, { eq }) => eq(p.id, presetId) })
}

export async function deletePreset(presetId: number, userid: string): Promise<boolean> {
  const result = await db
    .delete(presets)
    .where(and(eq(presets.id, presetId), eq(presets.userid, userid)))
  return (result[0] as { affectedRows: number }).affectedRows > 0
}
