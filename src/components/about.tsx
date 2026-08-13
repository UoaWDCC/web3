const events = [
  {
    src: "/images/Launchnight3.jpg",
    alt: "Learn & Build",
    label: "Learn & Build",
    description: "Hands-on workshops covering blockchain fundamentals, smart contract development, and integration with AI.",
    bg : "bg-[#D8B6F7]",
  },
  {
    src: "/images/Launchnight1.jpg",
    alt: "Community",
    label: "Community",
    description: "Connect with a diverse network of students, alumni, and industry professionals passionate about Web3.",
    bg : "bg-[#A3DEF4]",
  },
  {
    src: "/images/GovDojo1.jpg",
    alt: "Opportunities",
    label: "Opportunities",
    description: "Gain exclusive access to internships, hackathons, and career pathways in the evolving blockchain ecosystem.",
    bg : "bg-[#92ABFF]",
  },
];

export function About() {
  return (

    <section id="about" className="min-h-screen bg-gradient-to-r pt-28 px-4">
      {/* MAIN CONTAINER */}
      <div className="max-w-6xl mx-auto bg-nav-bg rounded-[48px] p-8 md:p-16 shadow-xl mt-20 mb-20">

        {/* Section header */}
        <div className="max-w-4xl mx-auto mb-14 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight tracking-tight text-hero-text font-sans md:whitespace-nowrap">
            Building the Decentralised future
          </h2>

          <p className="pt-4 text-base sm:text-xl leading-relaxed text-hero-text font-sans font-medium">
            We are Auckland's premier student-led organisation dedicated to <br/>
             blockchain education and innovation. We bridge the gap between <br/>
            university theory and industry-grade Web3 development.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
          {events.map((event, index) => {
            return (
              <div
                key={index}
                className="group flex flex-col items-center"
              >
                {/* image */}
                <img
                  src={event.src}
                  alt={event.alt}
                  className="w-full h-48 object-cover rounded-2xl mb-[-24px] z-10 relative shadow-md"
                />
                {/* background and content */}
                <div className={`flex flex-col items-center h-full w-full rounded-b-3xl pt-10 pb-8 px-4 sm:px-6 ${event.bg}`}>
                  <h3 className="text-xl sm:text-2xl font-semibold mb-4 text-center">
                    {event.label}
                  </h3>

                  {/* description */}
                  <h4 className="text-base sm:text-lg mb-3 text-center">
                    {event.description}
                  </h4>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
