interface Shortcut {
  keys: string;
  label: string;
}

interface KeyboardShortcutsProps {
  shortcuts: Shortcut[];
  title?: string;
}

/**
 * Displays a compact list of available keyboard shortcuts.
 */
export function KeyboardShortcuts({
  shortcuts,
  title = "Keyboard shortcuts",
}: KeyboardShortcutsProps) {
  // Avoid rendering an empty shortcuts panel.
  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <section className="keyboard-shortcuts" aria-label={title}>
      <h3>{title}</h3>
      <ul>
        {shortcuts.map((shortcut) => (
          <li key={shortcut.keys}>
            <kbd>{shortcut.keys}</kbd>
            <span>{shortcut.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
