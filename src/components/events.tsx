import Image from "next/image";

const displayEvents = [
  {
    label: "Launch Night",
    bg: "bg-[#D8B6F7]",
    events: [
      "/images/Launchnight1.jpg",
      "/images/Launchnight2.jpg",
      "/images/Launchnight3.jpg",
      "/images/Launchnight3.jpg",
      "/images/Launchnight3.jpg",
    ],
  },
  {
    label: "Industry Night",
    bg: "bg-[#A3DEF4]",
    events: [
      "/images/Launchnight1.jpg",
      "/images/Launchnight2.jpg",
      "/images/Launchnight3.jpg",
      "/images/Launchnight3.jpg",
      "/images/Launchnight3.jpg",
    ],
  },
  {
    label: "GovDojo",
    bg: "bg-[#92ABFF]",
    events: [
      "/images/Launchnight1.jpg",
      "/images/Launchnight2.jpg",
      "/images/Launchnight3.jpg",
      "/images/Launchnight3.jpg",
      "/images/Launchnight3.jpg",
    ],
  },
] as const;

export function Events() {
  return (
    <section
      id="events"
      className="min-h-screen bg-gradient-to-r pt-28 px-4"
    >
      <div className="max-w-6xl mx-auto bg-nav-bg rounded-[48px] p-8 md:p-16 shadow-xl mt-20 mb-20">
        {/* Header */}
        <div className="max-w-3xl mb-14">
          <h2 className="text-5xl md:text-6xl font-black leading-tight mb-4 text-hero-text">
            Moments That Matter
          </h2>

          <p className="text-xl font-medium text-black text-hero-text">
            From launch nights to industry meetups, see what
            <br />
            our community has been up to.
          </p>
        </div>

        {/* Event Sections */}
        <div className="flex flex-col gap-10">
          {displayEvents.map((section) => (
            <div
              key={section.label}
              className={`${section.bg} rounded-[28px] p-6 md:p-6`}
            >
              {/* Title */}
              <h3 className="text-2xl font-semibold mb-4 font-sans">
                {section.label}
              </h3>

              {/* Layout */}
              {/*// grid-cols-[2fr_1fr] frist 2 column, 1 seocnd column*/}
              <div className="grid grid-cols-[2fr_1fr] gap-4"> 
                {/* Left Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {section.events.slice(0, 4).map((event, index) => ( // index is added to make sure all keys(images) are unique remove index when we have different images
                    <div
                      key={`${event}-${index}`} // making sure all keys(images) are unique change it back to key={event} when we have different images
                      className="relative overflow-hidden rounded-2xl aspect-[16/10]" // aspect-[16/10] is Width : Height = 16 : 10
                    >
                      <Image
                        src={event}
                        alt={section.label}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>

                {/* Right Tall Image */}
                <div className="relative overflow-hidden rounded-2xl h-full min-h-[260px]">
                  <Image
                    src={section.events[4]}
                    alt={section.label}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}