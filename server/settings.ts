import { prisma } from './db';

const SINGLETON = 'singleton';

export async function getSettings() {
  const s = await prisma.settings.findUnique({ where: { id: SINGLETON } });
  if (s) return s;
  return prisma.settings.create({ data: { id: SINGLETON } });
}

export async function updateSettings(data: Record<string, unknown>) {
  await getSettings();
  return prisma.settings.update({ where: { id: SINGLETON }, data });
}
