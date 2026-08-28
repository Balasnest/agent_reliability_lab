type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ChevronDown({ className }: IconProps) {
  return (
    <svg className={className} {...base} strokeWidth={2}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ChevronUp({ className }: IconProps) {
  return (
    <svg className={className} {...base} strokeWidth={2}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

export function Send({ className }: IconProps) {
  return (
    <svg className={className} {...base} strokeWidth={2.25}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}

export function Box({ className }: IconProps) {
  return (
    <svg className={className} {...base} strokeWidth={1.75}>
      <path d="M21 7.5v9l-9 5-9-5v-9l9-5 9 5z" />
      <path d="M3 7.5l9 5 9-5" />
      <path d="M12 12.5V22" />
    </svg>
  );
}

export function Book({ className }: IconProps) {
  return (
    <svg className={className} {...base} strokeWidth={1.75}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function Flag({ className }: IconProps) {
  return (
    <svg className={className} {...base} strokeWidth={1.9}>
      <path d="M5 3v18" />
      <path d="M5 4h13l-2.5 4.5L18 13H5" />
    </svg>
  );
}

export function MessageCircle({ className }: IconProps) {
  return (
    <svg className={className} {...base} strokeWidth={1.9}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function CheckCircle({ className }: IconProps) {
  return (
    <svg className={className} {...base} strokeWidth={2.25}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="8.5 12.5 11 15 15.5 9.5" />
    </svg>
  );
}
