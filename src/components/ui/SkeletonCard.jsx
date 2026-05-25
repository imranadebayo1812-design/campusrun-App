export function SkeletonCard({ lines = 2 }) {
  return (
    <div className="bg-surface-800 border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl skeleton-shimmer shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 skeleton-shimmer rounded-lg w-3/5" />
        {lines >= 2 && <div className="h-3 skeleton-shimmer rounded-lg w-2/5" />}
        {lines >= 3 && <div className="h-3 skeleton-shimmer rounded-lg w-4/5" />}
      </div>
      <div className="space-y-1.5 shrink-0">
        <div className="h-3 skeleton-shimmer rounded-lg w-16" />
        <div className="h-4 skeleton-shimmer rounded-lg w-12" />
      </div>
    </div>
  );
}

export function SkeletonVendor() {
  return (
    <div className="bg-surface-800 border border-white/[0.06] rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl skeleton-shimmer shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 skeleton-shimmer rounded-lg w-2/3" />
          <div className="h-3 skeleton-shimmer rounded-lg w-1/2" />
        </div>
      </div>
      <div className="h-3 skeleton-shimmer rounded-lg w-4/5" />
    </div>
  );
}
