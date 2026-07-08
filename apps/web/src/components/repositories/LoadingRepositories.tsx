function LoadingRepositories() {
  return (
    <div
      className="
        grid
        gap-6
        sm:grid-cols-2
        xl:grid-cols-3
      "
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="
            h-72
            animate-pulse
            rounded-2xl
            border
            border-slate-800
            bg-slate-900
          "
        />
      ))}
    </div>
  );
}

export default LoadingRepositories;