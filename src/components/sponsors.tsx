import Image from "next/image";
import { Button } from "@/components/ui/button";

// Sponsor tiers and their sponsors
const sponsorTiers = [
  {
    tier: "Gold Sponsors",
    label: "Gold Sponsors",
    bg: "bg-[#D8B6F7]",
    sponsors: [
      {
        // name: "FireEyes",
        logo: "/logo/fe_black_logo.svg",
        logoWidth: 220,
        logoHeight: 90,
      },
    ],
  },
  {
    tier: "Silver Sponsors",
    label: "Silver Sponsors",
    bg: "bg-[#A3DEF4]",
    sponsors: [
      {
        // name: "Avalanche",
        logo: "/logo/avalanche_logo.svg",
        logoWidth: 220,
        logoHeight: 90,
      },
    ],
  },
  {
    tier: "Supported by",
    label: "Supported by",
    bg: "bg-[#92ABFF]",
    sponsors: [
      {
        // name: "Ethereum Foundation",
        logo: "/logo/ethereum_foundation_dev_accel_logo.png",
        logoWidth: 300,
        logoHeight: 110,
      },
    ],
  },
] as const;

export function Sponsors() {
  return (
    <section
      id="partners"
      className="min-h-screen bg-gradient-to-r pt-28 px-4"
    >
      <div className="max-w-6xl mx-auto bg-nav-bg rounded-[48px] p-8 md:p-16 shadow-xl mt-20 mb-20">
        <div className="container mx-auto px-2 sm:px-4">
          {/* Section header */}
          <div className="mb-10 md:mb-16 space-y-4 max-w-2xl">
            <h2 className="text-5xl md:text-6xl font-black leading-tight mb-4 text-hero-text font-sans">
              Our Sponsors
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-hero-text font-sans font-medium">
              Collaborating with industry leaders to drive<br />
              the future of Web3 in New Zealand.
            </p>
          </div>

          {/* Sponsor grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-15">
            {sponsorTiers.map((tier) =>
              tier.sponsors.map((sponsor) => (
                <div
                  key={sponsor.logo}
                  className="group flex flex-col items-center"
                >
                  {/* Coloured card with logo and sponsor info */}
                  <div
                    className={`flex flex-col items-center h-full w-full rounded-3xl py-8 px-4 sm:px-6 ${tier.bg}`}
                  >
                    {/* same vertical for the logo*/}
                    <div className="flex items-center justify-center h-28 w-full mb-6">
                      <Image
                        src={sponsor.logo}
                        alt={`${sponsor.logo} logo`}  
                        width={sponsor.logoWidth}
                        height={sponsor.logoHeight}
                        className="h-auto max-h-40 w-auto max-w-full object-contain mx-auto mb-6"
                      />
                    </div>
                    <h4 className="text-base sm:text-lg md:text-2xl text-center font-semibold">
                      {tier.label}
                    </h4>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Become a Partner button*/}
          <div className="pt-10">
            <Button
              size="sm"
              className="h-12 rounded-xl font-bold border-2 transition-all !bg-nav-bg !border-button-bor !text-button-bor hover:!bg-button-bor hover:!text-white hover:!border-button-bor"
              asChild
            >
              <a href="mailto:team@web3uoa.nz">Become a Partner</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
