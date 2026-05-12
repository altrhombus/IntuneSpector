// CSS custom property definitions injected into the shadow root.
// Components reference var(--is-*) instead of hardcoded hex values.
// Status colors (green/red/orange) are intentionally kept as hex in
// components — they are semantic and theme-neutral.

export const THEME_CSS = `
:host([data-theme="dark"]) {
  --is-bg:              #1b1b1b;
  --is-bg-raised:       #222;
  --is-bg-section:      #1f1f1f;
  --is-bg-surface:      #161616;
  --is-bg-code:         #141414;
  --is-border:          #2a2a2a;
  --is-border-subtle:   #1e1e1e;
  --is-text:            #e8e8e8;
  --is-text-2:          #d4d4d4;
  --is-text-3:          #c8c8c8;
  --is-text-muted:      #888;
  --is-text-subtle:     #666;
  --is-text-faint:      #555;
  --is-text-faintest:   #444;
  --is-accent:          #0078d4;
  --is-accent-bg:       rgba(0,120,212,0.08);
  --is-accent-border:   rgba(0,120,212,0.2);
  --is-shadow:          rgba(0,0,0,0.45);
  --is-input-bg:        #1a1a1a;
  --is-input-border:    #2a2a2a;
  --is-badge-bg:        #2a2a2a;
  --is-badge-text:      #666;
}

:host([data-theme="light"]) {
  --is-bg:              #ffffff;
  --is-bg-raised:       #f8f8f8;
  --is-bg-section:      #f3f2f1;
  --is-bg-surface:      #fafafa;
  --is-bg-code:         #f3f2f1;
  --is-border:          #e1dfdd;
  --is-border-subtle:   #edebe9;
  --is-text:            #323130;
  --is-text-2:          #3b3a39;
  --is-text-3:          #484644;
  --is-text-muted:      #605e5c;
  --is-text-subtle:     #8a8886;
  --is-text-faint:      #a19f9d;
  --is-text-faintest:   #c8c6c4;
  --is-accent:          #0078d4;
  --is-accent-bg:       rgba(0,120,212,0.06);
  --is-accent-border:   rgba(0,120,212,0.25);
  --is-shadow:          rgba(0,0,0,0.12);
  --is-input-bg:        #ffffff;
  --is-input-border:    #d2d0ce;
  --is-badge-bg:        #edebe9;
  --is-badge-text:      #605e5c;
}

:host([data-theme="dark"]) ::-webkit-scrollbar { width: 6px; height: 6px; }
:host([data-theme="dark"]) ::-webkit-scrollbar-track { background: var(--is-bg); }
:host([data-theme="dark"]) ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }

:host([data-theme="light"]) ::-webkit-scrollbar { width: 6px; height: 6px; }
:host([data-theme="light"]) ::-webkit-scrollbar-track { background: var(--is-bg); }
:host([data-theme="light"]) ::-webkit-scrollbar-thumb { background: #c8c6c4; border-radius: 3px; }
`
