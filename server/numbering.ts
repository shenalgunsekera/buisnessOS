import { prisma } from './db';

function pad(n: number, width = 4) {
  return String(n).padStart(width, '0');
}

export async function nextQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `Q-${year}-`;
  const last = await prisma.quotation.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const lastN = last ? Number(last.number.slice(prefix.length)) : 0;
  return `${prefix}${pad(lastN + 1)}`;
}

export async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });
  const lastN = last ? Number(last.number.slice(prefix.length)) : 0;
  return `${prefix}${pad(lastN + 1)}`;
}
