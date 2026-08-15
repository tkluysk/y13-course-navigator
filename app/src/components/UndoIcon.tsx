interface Props {
  size?: number;
  className?: string;
}

export default function UndoIcon({ size = 14, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M7 8H4V5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 8c1.8-2.7 4.8-4.5 8-4.5 5.2 0 9.5 4.3 9.5 9.5S17.2 22.5 12 22.5c-4 0-7.5-2.5-8.9-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
