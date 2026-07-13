export default function Loading() {
  return (
    <main
      className="app-loading flex min-h-screen flex-col gap-5 px-5 pb-28 pt-10"
      aria-busy="true"
      aria-label="Carregando módulo"
    >
      <div className="flex items-center gap-3">
        <span className="loading-shimmer h-8 w-8 rounded-xl" />
        <span className="loading-shimmer h-6 w-28 rounded-lg" />
      </div>

      <section className="loading-panel rounded-[1.75rem] p-5">
        <div className="flex items-start gap-4">
          <span className="loading-shimmer h-16 w-16 shrink-0 rounded-2xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <span className="loading-shimmer h-3 w-28 rounded-full" />
            <span className="loading-shimmer h-8 w-4/5 rounded-lg" />
            <span className="loading-shimmer h-4 w-3/5 rounded-full" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2">
          <span className="loading-shimmer h-20 rounded-2xl" />
          <span className="loading-shimmer h-20 rounded-2xl" />
          <span className="loading-shimmer h-20 rounded-2xl" />
        </div>
      </section>

      <div className="loading-shimmer h-12 rounded-2xl" />
      <div className="loading-shimmer h-40 rounded-3xl" />
    </main>
  );
}
