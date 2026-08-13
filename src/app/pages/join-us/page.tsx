import { RegistrationForm } from "../../../components/registration-form";

export default function JoinUs() {
  return (
    <main>
      <section
        id="join-us"
        className="min-h-screen bg-gradient-to-r pt-28 px-4"
      >
        <div className="max-w-6xl mx-auto bg-nav-bg rounded-[48px] p-8 md:p-16 shadow-xl mt-20 mb-20">
          <div className="mx-auto max-w-[1320px] px-2 sm:px-4">
            {/* Section header */}
            <div className="max-w-4xl mx-auto mb-14 text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight mb-4 text-hero-text">
                Join Web3
              </h2>

              <p className="pt-2 text-base sm:text-xl text-hero-text font-sans font-medium">
                A student-led club at the University of Auckland for anyone <br/>
                interested in blockchain, AI, and the wider Web3 space.
                <br />
                Sign up to learn, connect and stay updated on events.
              </p>
            </div>
            
            {/* Sign up grid */}
            <div className="mx-auto w-full pb-20">
              <RegistrationForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
