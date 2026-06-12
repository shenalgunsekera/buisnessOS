import path from 'path';
import notifier from 'node-notifier';

const ICON_PATH = path.join(__dirname, '..', 'electron', 'icon.png');

export function notify(opts: { title: string; message: string }) {
  try {
    notifier.notify({
      appID: 'BusinessOS',
      title: opts.title,
      message: opts.message,
      icon: ICON_PATH,
      sound: true,
      wait: false,
    });
  } catch (err) {
    console.error('[notify] failed', err);
  }
}
