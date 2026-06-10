import { stats } from "@/lib/dashboard-data";

const toneClass: Record<string, string> = {
  steel: "border-steel text-steel",
  moss: "border-moss text-moss",
  coral: "border-coral text-coral",
  ink: "border-ink text-ink"
};

export function StatStrip() {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-md border border-line bg-white px-5 py-4 shadow-soft"
        >
          <div className="text-xs font-medium uppercase tracking-normal text-slate-500">
            {stat.label}
          </div>
          <div className={`mt-3 border-l-4 pl-3 ${toneClass[stat.tone]}`}>
            <div className="text-3xl font-semibold leading-none">{stat.value}</div>
          </div>
        </div>
      ))}
    </section>
  );
}
