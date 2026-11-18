import { Hero } from "@/components/hero";
import { EnsClaim } from "@/components/ens-claim";
import { About } from "@/components/about";
import { Sponsors } from "@/components/sponsors";
import { BadgeCheck, Wallet, Globe } from "lucide-react";

export default function Home() {
  return (
    <main>
      <Hero />

      {/* ENS Subname Claim Section */}
      {/*
      <section
        id="identity"
        className="min-h-[80vh] flex flex-col justify-center py-20 border-b border-border/50 relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse animation-delay-2000" />

        <div className="container mx-auto relative z-10 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
                Get your <span className="text-primary">.web3uoa.eth</span>{" "}
                identity
              </h2>

              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Ditch the long standard wallet addresses. Claim your
                personalised, readable Web3 identity, exclusive to University of
                Auckland Web3 Club members.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-3xl mx-auto mb-12">
                <div className="bg-background/80 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-sm">
                  <BadgeCheck className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-bold text-lg mb-2">Verified Member</h3>
                  <p className="text-sm text-muted-foreground">
                    Show your club affiliation prominently on social media and leaderboards.
                  </p>
                </div>

                <div className="bg-background/80 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-sm">
                  <Wallet className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-bold text-lg mb-2">Easy Transfers</h3>
                  <p className="text-sm text-muted-foreground">
                    Send and receive crypto easily without copying 42-character hex strings.
                  </p>
                </div>

                <div className="bg-background/80 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-sm">
                  <Globe className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-bold text-lg mb-2">Web3 Native</h3>
                  <p className="text-sm text-muted-foreground">
                    Log into dApps seamlessly using your new human-readable ENS subname.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative max-w-md mx-auto">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 rounded-[2rem] blur-xl opacity-50" />
              <EnsClaim />
            </div>
          </div>
        </div>
      </section>
      */}

      {/* don't know if still need the about/sponsors sections, so commenting out for now */}
      {/* <About />*/}
      {/*<Sponsors />*/}
    </main>
  );
}