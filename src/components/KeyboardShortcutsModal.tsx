import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause Video' },
    { key: '← / →', desc: 'Seek 5 seconds backward / forward' },
    { key: '↑ / ↓', desc: 'Adjust volume by 10%' },
    { key: 'M', desc: 'Toggle Mute / Unmute' },
    { key: 'F', desc: 'Toggle Fullscreen Mode' },
    { key: 'T', desc: 'Toggle Theater View' },
    { key: 'S', desc: 'Take Full-Resolution Video Snapshot' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {shortcuts.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-0"
            >
              <span className="text-xs text-slate-300">{item.desc}</span>
              <kbd className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-[11px] font-semibold text-indigo-300 shadow-inner">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 text-center">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-slate-800 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
