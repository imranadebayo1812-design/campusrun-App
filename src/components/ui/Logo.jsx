export default function Logo({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="20" cy="20" r="20" fill="url(#logoGrad)" />
      {/* Runner silhouette */}
      <circle cx="23" cy="10" r="2.5" fill="white" />
      <path
        d="M20 13.5 L17 20 L20 19 L22 24 L25 22 L23 18 L26 15 Z"
        fill="white"
        opacity="0.95"
      />
      <path
        d="M17 20 L13 23 M22 24 L20 28 L17 27"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
    </svg>
  );
}
