interface Props {
  locked?: boolean;
  size?: number;
  className?: string;
}

export default function LockIcon({ locked = false, size = 14, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      {locked ? (
        <path
          d="M7 10V8a5 5 0 0 1 10 0v2h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1zm2 0h6V8a3 3 0 0 0-6 0v2z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M7 10V8a5 5 0 0 1 9.584-1.986 1 1 0 1 1-1.848.765A3 3 0 0 0 9 8v2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h1z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}
