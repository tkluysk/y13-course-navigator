interface Props {
  locked?: boolean;
  size?: number;
  className?: string;
}

export default function LockIcon({ locked = false, size = 14, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" />
      {locked ? (
        // shackle: closed, straddling the body
        <path
          d="M8 11V8a4 4 0 0 1 8 0v3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      ) : (
        // shackle: swung open, pivoting from the right side of the body,
        // its free end lifted clear up and to the left — unmistakably ajar
        <path
          d="M8 11V8a4 4 0 0 1 8 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          transform="rotate(-28 16 8)"
        />
      )}
    </svg>
  );
}
