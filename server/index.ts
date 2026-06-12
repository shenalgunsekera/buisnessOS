import path from 'path';
import express from 'express';
import cors from 'cors';
import { prisma } from './db';
import { companiesRouter } from './routes/companies';
import { paymentsRouter } from './routes/payments';
import { subscriptionsRouter } from './routes/subscriptions';
import { remindersRouter } from './routes/reminders';
import { quotationsRouter } from './routes/quotations';
import { invoicesRouter } from './routes/invoices';
import { expensesRouter } from './routes/expenses';
import { contractsRouter } from './routes/contracts';
import { tasksRouter } from './routes/tasks';
import { settingsRouter } from './routes/settings';
import { calendarRouter } from './routes/calendar';
import { reportsRouter } from './routes/reports';
import { dashboardRouter } from './routes/dashboard';
import { startScheduler } from './scheduler';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const isProd = process.env.NODE_ENV === 'production';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => { res.json({ ok: true, time: new Date().toISOString() }); });

app.use('/api/companies', companiesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/quotations', quotationsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/dashboard', dashboardRouter);

if (isProd) {
  const outDir = path.resolve(process.env.BUSINESSOS_OUT_DIR ?? path.join(__dirname, '..', 'out'));
  app.use(express.static(outDir, { extensions: ['html'] }));
  app.get(/^\/(?!api\/).*/, (_req, res) => { res.sendFile(path.join(outDir, 'index.html')); });
}

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT} (prod=${isProd})`);
  startScheduler();
});

const shutdown = async () => { await prisma.$disconnect(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
