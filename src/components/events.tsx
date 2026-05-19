const events = [
  {
    src: "/images/Launchnight2.jpg",
    alt: "Launch Night event",
    label: "Launch Night",
  },
  {
    src: "/images/Launchnight3.jpg",
    alt: "Launch Night networking",
    label: "Launch Night",
  },
  {
    src: "/images/GovDojo1.jpg",
    alt: "GovDojo workshop",
    label: "GovDojo",
  },
  {
    src: "/images/Industrynight1.jpg",
    alt: "Industry Night",
    label: "Industry Night",
  },
  {
    src: "/images/Launchnight1.jpg",
    alt: "Launch Night presentation",
    label: "Launch Night",
  },
];

export function Events() {
  return (
    <section
      id="events"
      className="py-24 md:py-32 bg-secondary border-t border-border/50"
    >
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="mb-16 space-y-4">
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
            02 / Events
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Moments That Matter
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed whitespace-normal sm:whitespace-pre-line">
            From launch nights to industry meetups, see what our community has
            been up to.
          </p>
        </div>

        {/* Masonry-style photo grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {events.map((event, index) => (
            <div
              key={index}
              className={`group relative overflow-hidden rounded-2xl bg-background border border-border/50 shadow-sm ${
                index === 0 ? "md:row-span-2 md:col-span-1" : ""
              }`}
            >
              <img
                src={event.src}
                alt={event.alt}
                className={`w-full object-cover transition-transform duration-700 group-hover:scale-105 ${
                  index === 0 ? "h-48 md:h-[100%]" : "h-48 md:h-64"
                }`}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                <span className="text-white text-lg font-bold tracking-wide">
                  {event.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
