interface Props {
  size?: number;
  className?: string;
}

export default function WarningIcon({ size = 14, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 3.5 22 20.5H2z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="11.1" y="9.5" width="1.8" height="5.5" rx="0.9" fill="var(--bg)" />
      <rect x="11.1" y="16.2" width="1.8" height="1.8" rx="0.9" fill="var(--bg)" />
    </svg>
  );
}
