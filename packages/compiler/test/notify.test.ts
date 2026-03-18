// ---------------------------------------------------------------------------
// Tests — Notification Helper
// ---------------------------------------------------------------------------

import { describe, it, expect, vi } from 'vitest';
import { buildNotificationMessage, sendNotification } from '../src/cli/notify.js';

describe('sendNotification', () => {
  it('returns false when node-notifier is not available', async () => {
    const result = await sendNotification('Test', 'Hello');
    // node-notifier is not installed in test env, so dynamic import fails
    expect(result).toBe(false);
  });

  it('returns true when node-notifier is available', async () => {
    const mockNotify = vi.fn();
    // Mock the dynamic import of node-notifier
    vi.doMock('node-notifier', () => ({
      default: { notify: mockNotify },
    }));
    // Re-import to get a fresh module that uses the mock
    const { sendNotification: send } = await import('../src/cli/notify.js');
    const result = await send('Build', 'ok');
    expect(result).toBe(true);
    expect(mockNotify).toHaveBeenCalledWith({ title: 'Build', message: 'ok' });
    vi.doUnmock('node-notifier');
  });
});

describe('buildNotificationMessage', () => {
  it('builds success message', () => {
    const msg = buildNotificationMessage('MyApp', true, 0);
    expect(msg.title).toBe('Prodara Build');
    expect(msg.message).toContain('succeeded');
    expect(msg.message).toContain('MyApp');
  });

  it('builds failure message with error count', () => {
    const msg = buildNotificationMessage('MyApp', false, 3);
    expect(msg.message).toContain('failed');
    expect(msg.message).toContain('3 errors');
  });

  it('handles singular error count', () => {
    const msg = buildNotificationMessage('MyApp', false, 1);
    expect(msg.message).toContain('1 error');
    expect(msg.message).not.toContain('errors');
  });
});
