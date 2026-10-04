// This is an internal, fixed-purpose channel. No page bridge, arbitrary script
// execution, URL fetching, or room data is exposed through extension messaging.
export function registerToolbar(runtime, app) {
  const listener = (message, sender, respond) => {
    if (sender?.id !== runtime.id || sender.url !== runtime.getURL('popup.html') ||
        !message || Array.isArray(message) || Object.keys(message).length !== 1 ||
        !['swap:status', 'swap:show', 'swap:hide'].includes(message.type)) return false;
    if (!app) { respond({ status: 'duplicate' }); return false; }
    if (message.type === 'swap:show') app.show();
    if (message.type === 'swap:hide') app.hide();
    const { inRoom, open, hidden } = app.status();
    respond({ status: 'ready', inRoom: !!inRoom, open: !!open, hidden: !!hidden });
    return false;
  };
  runtime.onMessage.addListener(listener);
  return () => runtime.onMessage.removeListener(listener);
}
