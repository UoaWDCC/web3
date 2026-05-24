import { RegistrationForm } from "../../../components/registration-form";

export default function JoinUs() {
  return (
    <main>
      <section
        id="join-us"
        className="min-h-screen pt-54 px-4 pb-30 md:px-6"
      >
        <div className="mx-auto mt-10 mb-16 max-w-[1320px] rounded-[80px] bg-nav-bg p-8 md:p-14 lg:p-16 shadow-xl">
          <div className="mx-auto max-w-[1320px] px-2 sm:px-4">
            {/* Section header */}
            <div className="mb-12 md:mb-16 space-y-5 max-w-4xl pl-8">
              <h2 className="mb-4 text-6xl font-bold leading-none text-hero-text lg:text-6xl">
                Join Web3
              </h2>
              <p className="max-w-4xl text-xl pt-8 font-medium leading-tight text-hero-text font-sans md:text-2xl lg:text-[1.8rem]">
                A student-led club at the University of Auckland for anyone
                interested in blockchain, AI, and the wider Web3 space.
                <br />
                Sign up to learn, connect and stay updated on events.
              </p>
            </div>

            {/* Sign up grid */}
            <div className="mx-auto w-full pb-30">
              <RegistrationForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
