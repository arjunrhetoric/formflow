export const THEME_PRESETS: Record<string, { id: string; label: string; desc: string; css: string; preview: { bg: string; accent: string; text: string }; bodyClass: string; cardClass: string; }> = {
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    desc: 'Clean, white Notion-style',
    css: `
      .ff-stage {
        background-image:
          radial-gradient(circle at top, rgba(24, 24, 27, 0.04), transparent 36%),
          linear-gradient(180deg, rgba(255,255,255,0.92), rgba(244,244,245,0.96));
      }
    `,
    preview: { bg: '#ffffff', accent: '#18181b', text: '#09090b' },
    bodyClass: 'bg-[#fafafa]',
    cardClass: 'bg-white border-[#e4e4e7]',
  },
  bold: {
    id: 'bold',
    label: 'Bold',
    desc: 'Dark bg, vivid colors, large type',
    css: `
      .ff-stage {
        background-image:
          radial-gradient(circle at top, rgba(250,250,250,0.08), transparent 28%),
          linear-gradient(180deg, #09090b, #111113);
      }
      .ff-stage label { color: #fafafa; }
      .ff-stage .text-muted-foreground { color: #a1a1aa; }
      .ff-stage input, .ff-stage textarea, .ff-stage select {
        background: #27272a; border-color: #3f3f46; color: #fafafa;
      }
      .ff-stage input::placeholder, .ff-stage textarea::placeholder { color: #71717a; }
    `,
    preview: { bg: '#09090b', accent: '#8b5cf6', text: '#ffffff' },
    bodyClass: 'bg-[#09090b] dark',
    cardClass: 'bg-[#18181b] border-[#27272a] text-white',
  },
  glassmorphism: {
    id: 'glassmorphism',
    label: 'Glassmorphism',
    desc: 'Frosted glass, gradient backdrop',
    css: `
      .ff-stage {
        background-image: linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4);
      }
      .ff-stage label { color: #ffffff; }
      .ff-stage .text-muted-foreground { color: rgba(255,255,255,0.7); }
      .ff-stage input, .ff-stage textarea, .ff-stage select {
        background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); color: #ffffff;
      }
      .ff-stage input::placeholder, .ff-stage textarea::placeholder { color: rgba(255,255,255,0.5); }
      .ff-stage button[type="submit"] { background: rgba(255,255,255,0.25); backdrop-filter: blur(8px); }
    `,
    preview: { bg: 'linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)', accent: '#ffffff', text: '#ffffff' },
    bodyClass: 'bg-gradient-to-br from-purple-600 via-blue-500 to-cyan-400 dark',
    cardClass: 'bg-white/20 backdrop-blur-xl border-white/30 text-white shadow-2xl',
  },
  corporate: {
    id: 'corporate',
    label: 'Corporate',
    desc: 'Navy + white, serif typography',
    css: `
      .ff-stage {
        font-family: Georgia, 'Times New Roman', serif;
        background-image:
          linear-gradient(180deg, rgba(30,58,95,0.08), transparent 26%),
          linear-gradient(180deg, #f0f2f5, #e8edf4);
      }
      .ff-stage h1 { color: #1e3a5f; }
      .ff-stage button[type="submit"] { background: #1e3a5f; }
    `,
    preview: { bg: '#f0f2f5', accent: '#1e3a5f', text: '#1e3a5f' },
    bodyClass: 'bg-[#f0f2f5]',
    cardClass: 'bg-white border-[#1e3a5f] border-2',
  },
};

export const THEME_PRESETS_ARRAY = Object.values(THEME_PRESETS);
