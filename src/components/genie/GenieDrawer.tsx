"use client";

interface GenieDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function GenieDrawer({ open, onClose }: GenieDrawerProps) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Summon Your Genie">
      <button onClick={onClose}>Close</button>
      <p>Drawer placeholder</p>
    </div>
  );
}
