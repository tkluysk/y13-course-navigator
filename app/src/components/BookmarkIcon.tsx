interface Props {
  filled?: boolean;
  size?: number;
  className?: string;
}

export default function BookmarkIcon({ filled = false, size = 16, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 3.5c-.83 0-1.5.67-1.5 1.5v15.5l7.5-4.5 7.5 4.5V5c0-.83-.67-1.5-1.5-1.5H6z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}
