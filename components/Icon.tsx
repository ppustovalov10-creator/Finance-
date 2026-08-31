// Ported 1:1 from SVG_ICONS in the prototype.
const PATHS: Record<string, React.ReactNode> = {
  cart: (
    <>
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
      <path d="M3 4h2l2.5 12h11l2-8H6" />
    </>
  ),
  coffee: (
    <>
      <path d="M18 8h1a3 3 0 0 1 0 6h-1" />
      <path d="M2 8h16v6a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <path d="M6 2v2M10 2v2M14 2v2" />
    </>
  ),
  star: <path d="M12 2l2.9 6.3L22 9.3l-5 4.9 1.2 7.1L12 17.8l-6.2 3.5L7 14.2 2 9.3l7.1-1z" />,
  box: (
    <>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  shirt: <path d="M16 3l5 4-3 3-2-1.5V21H8V8.5L6 10 3 7l5-4c0 1.7 1.8 3 4 3s4-1.3 4-3z" />,
  pill: (
    <>
      <rect x="2" y="9" width="20" height="6" rx="3" />
      <line x1="12" y1="9" x2="12" y2="15" />
    </>
  ),
  bus: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M3 11h18" />
      <circle cx="7" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </>
  ),
  cash: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  qrcode: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <line x1="14" y1="14" x2="14" y2="21" />
      <line x1="21" y1="14" x2="21" y2="21" />
      <line x1="17.5" y1="14" x2="17.5" y2="17.5" />
      <line x1="14" y1="17.5" x2="21" y2="17.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.5-1.5 1-1.5 2.2" />
      <line x1="12" y1="17" x2="12" y2="17.01" />
    </>
  ),
  exchange: <path d="M4 7h13l-3-3M20 17H7l3 3" />,
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  pencil: (
    <>
      <path d="M11 4H4v16h16v-7" />
      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3l10 18H2z" />
      <line x1="12" y1="9" x2="12" y2="14" />
      <line x1="12" y1="17" x2="12" y2="17.01" />
    </>
  ),
  tag: (
    <>
      <path d="M20 12l-8 8-9-9V3h8z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </>
  ),
  home: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
};

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "plus" ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name] || PATHS.tag}
    </svg>
  );
}

export function IconBadge({ name, small }: { name: string; small?: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 rounded-lg align-[-7px] mr-0.5"
      style={{
        width: small ? 18 : 26,
        height: small ? 18 : 26,
        background: "var(--hover, rgba(245,243,236,0.05))",
        color: "var(--ink)",
        verticalAlign: small ? -4 : -7,
      }}
    >
      <Icon name={name} className={small ? "w-[11px] h-[11px]" : "w-[14px] h-[14px]"} />
    </span>
  );
}

export function InlineIcon({ name }: { name: string }) {
  return (
    <span className="inline-block align-[-2px] mr-1">
      <Icon name={name} className="w-[13px] h-[13px]" />
    </span>
  );
}
