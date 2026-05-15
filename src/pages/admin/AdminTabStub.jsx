export default function AdminTabStub({ title }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-gray-600">
      <div className="w-12 h-12 bg-surface-800 rounded-2xl flex items-center justify-center mb-4">
        <span className="text-2xl">🚧</span>
      </div>
      <p className="text-base font-semibold text-gray-400">{title}</p>
      <p className="text-sm mt-1">Coming soon</p>
    </div>
  );
}
