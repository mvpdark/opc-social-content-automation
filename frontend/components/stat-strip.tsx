import { stats } from "@/lib/dashboard-data";

const toneClass: Record<string, string> = {
  steel: "border-steel text-steel bg-steel/5",
  moss: "border-moss text-moss bg-moss/5",
  coral: "border-coral text-coral bg-coral/5",
  ink: "border-ink text-ink bg-ink/5"
};

export function StatStrip() {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-md border border-line bg-white px-4 py-3 shadow-panel"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-slate-500">{stat.label}</div>
              <div className="mt-1 text-xs text-slate-400">{stat.helper}</div>
            </div>
            <div
              className={`flex h-9 min-w-12 items-center justify-center rounded-md border-l-4 px-3 text-2xl font-semibold leading-none ${toneClass[stat.tone]}`}
            >
              {stat.value}
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
