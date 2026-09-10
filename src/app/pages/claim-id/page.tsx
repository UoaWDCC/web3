// import { EnsClaim } from "@/components/ens-claim"; // ← unsued component
import { BadgeCheck, Wallet, Globe } from "lucide-react";
import { WalletButton } from "@/components/wallet-button";

const features = [
  {
    icon: BadgeCheck,
    title: "Verified Member",
    description:
      "Show your club affiliation prominently on social media and leaderboards.",
    bg: "bg-[#D8B6F7]",
  },
  {
    icon: Wallet,
    title: "Easy Transfers",
    description:
      "Send and receive crypto easily without copying 42-character hex strings.",
    bg: "bg-[#A3DEF4]",
  },
  {
    icon: Globe,
    title: "Web3 Native",
    description:
      "Log into Apps seamlessly using your new human-readable ENS subname.",
    bg: "bg-[#92ABFF]",
  },
];

export default function ClaimIdPage() {
  return (
    <main className="min-h-screen bg-gradient-to-r pt-28 px-4">

      {/* MAIN CONTAINER */}
      <div className="max-w-6xl mx-auto bg-nav-bg rounded-[48px] p-8 md:p-20 shadow-xl mt-20 mb-20">

        {/* HERO SECTION */}
        <div className="max-w-4xl mx-auto mb-10 md:mb-16 text-center">

          <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight mb-4 -mt-4 text-hero-text font-sans">
            Get your Web3 identity
          </h1>

          <p className="pt-2 text-base sm:text-xl text-hero-text font-sans font-medium">
            Ditch the long standard wallet addresses <br />
            Claim your personalised, readable Web3 identity, exclusive<br />
             to University of Auckland Web3 Club members.
          </p>

        </div>

        {/* FEATURE CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-20 mb-12">

          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className={`${feature.bg} rounded-[32px] p-8 min-h-[320px] flex flex-col shadow-md`}
              >
                {/* Icon */}
                <Icon className="w-50 h-30 text-white mb-10 self-center" />
                {/* title */}
                <h3 className="text-2xl font-bold mb-4 text-center font-semibold">
                  {feature.title}
                </h3>
                {/* Description */}
                <p className="text-lg leading-snug text-black text-center">
                  {feature.description}
                </p>

              </div>
            );
          })}

        </div>

        {/* CTA SECTION */}
        <div className="space-y-6 text-center">

          <h2 className="text-2xl md:text-xl font-semibold text-hero-text ">
            Connect your wallet to reserve your Web3 subname
          </h2>

          <div className="flex justify-center">
            <WalletButton />
          </div>

        </div>

      </div>
    </main>
  );
}