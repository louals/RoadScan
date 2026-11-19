export function RoadScanMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20 3.5c-8 0-14.5 6.3-14.5 14.1 0 9.4 12.5 18 14 18.8.3.2.7.2 1 0 1.5-.8 14-9.4 14-18.8C34.5 9.8 28 3.5 20 3.5Z" stroke="currentColor" strokeWidth="2.2" />
      <path d="m15.4 9.8 3.2 7.1-3.2 7.2M24.6 9.8l-3.2 7.1 3.2 7.2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 12.8v2M20 19v2" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="20" cy="17" r="2.1" fill="#E6A23A" />
    </svg>
  );
}
