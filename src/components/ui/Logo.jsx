export default function Logo({ size = 40, className = '' }) {
  return (
    <div
      className={`bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/logo.png"
        alt="CampusRun"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}
