function LoadingProjects() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-2xl bg-slate-900"
          />
        )
      )}
    </div>
  );
}

export default LoadingProjects;