import { RegistrationForm } from "../../../components/registration-form";

export default function JoinUs() {
  return (
    <section
      id="join-us"
      className="py-24 md:py-32 bg-background border-t border-border/50"
    >
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className=" space-y-4 max-w-2xl mx-auto text-center">
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
            / Join Us
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Join our Web3 Club
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            A student-led club at the University of Auckland for anyone
            interested in blockchain, AI, and the wider Web3 space. Sign up to
            learn, connect, and stay updated on events.
            <br />
            <br />
            Bitcoin runs on Proof of Work. We run on Proof of Learn ✅
          </p>
        </div>

        {/* Sign up grid */}
        <div className="max-w-2xl mx-auto w-full">
          <RegistrationForm />
        </div>
      </div>
    </section>
  );
}
