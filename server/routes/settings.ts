import { Router } from 'express';
import { SettingsUpdateSchema } from '../validators';
import { getSettings, updateSettings } from '../settings';

export const settingsRouter = Router();

settingsRouter.get('/', async (_req, res) => {
  const s = await getSettings();
  // Don't return raw private key to client (mask).
  res.json({
    ...s,
    emailPrivateKey: s.emailPrivateKey ? '••••••' : null,
  });
});

settingsRouter.patch('/', async (req, res) => {
  const parsed = SettingsUpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues }); return; }
  // Preserve existing private key if client sent the mask placeholder.
  const data: Record<string, unknown> = { ...parsed.data };
  if (data.emailPrivateKey === '••••••') delete data.emailPrivateKey;
  const updated = await updateSettings(data);
  res.json({ ...updated, emailPrivateKey: updated.emailPrivateKey ? '••••••' : null });
});
