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

    <section id="about" className="py-24 md:py-32 bg-gradient-to-r border-t border-border/50">
      {/* MAIN CONTAINER */}
      <div className="w-full max-w-6xl mx-auto bg-nav-bg rounded-[48px] p-6 sm:p-10 md:p-16 shadow-xl my-10 md:my-20">
      <div className="container mx-auto px-2 sm:px-4">

        {/* Section header */}
        <div className="mb-10 md:mb-16 space-y-4 max-w-2xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-hero-text font-sans">
            Building the <br />
            Decentralised Future
          </h2>

          <p className="text-base sm:text-lg leading-relaxed text-hero-text font-sans">
            We are Auckland's premier student-led organisation dedicated <br/>
            to blockchain education and innovation. We bridge the gap between <br/>
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
      </div>
    </section>
    
  );
}
