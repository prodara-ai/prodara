// ---------------------------------------------------------------------------
// Prodara CLI — Notification Helper
// ---------------------------------------------------------------------------
// Sends desktop notifications. Uses node-notifier if available, otherwise
// falls back to a no-op.

/**
 * Send a desktop notification. Gracefully no-ops if node-notifier is not
 * installed.
 */
export async function sendNotification(title: string, message: string): Promise<boolean> {
  try {
    // Dynamic import — node-notifier is an optional peer dependency.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional peer dep
    const notifier = await (import('node-notifier' as string) as Promise<{ default: { notify(opts: { title: string; message: string }): void } }>).catch(() => null);
    if (!notifier) return false;

    notifier.default.notify({ title, message });
    return true;
  /* v8 ignore next 3 -- import().catch() handles the error path */
  } catch {
    return false;
  }
}

/**
 * Build a notification message for a build completion event.
 */
export function buildNotificationMessage(productName: string, success: boolean, errorCount: number): { title: string; message: string } {
  return {
    title: 'Prodara Build',
    message: success
      ? `✓ Build of "${productName}" succeeded`
      : `✗ Build of "${productName}" failed: ${errorCount} error${errorCount !== 1 ? 's' : ''}`,
  };
}
