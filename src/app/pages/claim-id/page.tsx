import { EnsClaim } from "@/components/ens-claim";
import { CheckCircle, Wallet, Globe } from "lucide-react";

const features = [
  {
    icon: CheckCircle,
    title: "Verified Member",
    description: "Show your club affiliation prominently on social media and leaderboards.",
  },
  {
    icon: Wallet,
    title: "Easy Transfers",
    description: "Send and receive crypto easily without copying 42-character hex strings.",
  },
  {
    icon: Globe,
    title: "Web3 Native",
    description: "Log into dApps seamlessly using your new human-readable ENS subname.",
  },
];

export default function ClaimIdPage() {
  return (
    <main className="pt-24 min-h-screen">
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-black mb-4">
          Get your <span className="text-primary">.web3uoa.eth</span> identity
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-12">
          Ditch the long standard wallet addresses. Claim your personalised, readable Web3
          identity, exclusive to University of Auckland Web3 Club members.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="p-6 rounded-2xl border border-border bg-secondary/30 text-left">
                <Icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>
        <EnsClaim />
      </div>
    </main>
  );
}