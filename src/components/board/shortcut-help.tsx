"use client";

const SHORTCUTS: Array<[string, string]> = [
  ["N", "New call, focus first field"],
  ["J / K", "Move down / up the call list"],
  ["D", "Stamp dispatched on selected call"],
  ["E", "Stamp enroute"],
  ["O", "Stamp on scene"],
  ["C", "Stamp cleared"],
  ["U", "Add unit to selected call"],
  ["/", "Search calls"],
  ["Esc", "Close pane, return to list"],
  ["?", "Toggle this reference"],
];

export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-border-strong bg-surface p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
            Keyboard shortcuts
          </h2>
          <button onClick={onClose} className="text-fg-dim hover:text-fg">
            ✕
          </button>
        </div>
        <dl className="space-y-1.5">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <dt className="font-mono-nums rounded border border-border-strong bg-surface-raised px-1.5 py-0.5 text-xs text-fg">
                {key}
              </dt>
              <dd className="text-fg-muted">{desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
