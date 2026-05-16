export function SkeletonCard({ lines = 2 }) {
  return (
    <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 flex items-center gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-surface-800 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-surface-800 rounded-lg w-3/5" />
        {lines >= 2 && <div className="h-3 bg-surface-800 rounded-lg w-2/5" />}
        {lines >= 3 && <div className="h-3 bg-surface-800 rounded-lg w-4/5" />}
      </div>
      <div className="space-y-1.5 shrink-0">
        <div className="h-3 bg-surface-800 rounded-lg w-16" />
        <div className="h-4 bg-surface-800 rounded-lg w-12" />
      </div>
    </div>
  );
}
