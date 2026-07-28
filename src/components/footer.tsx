import { Instagram, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4">
        {/* Main footer content */}
        <div className="py-20 grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-8 max-w-7xl mx-auto items-start">
          {/* Brand */}
          <div className="space-y-6 md:col-span-2">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/logo/web3uoa_logo.png"
                alt="WEB3UOA"
                className="w-10 h-10 shrink-0 brightness-0 invert"
              />
              <span className="text-2xl font-black tracking-tight whitespace-nowrap">
                WEB3UOA
              </span>
            </div>
            <p className="text-background/70 leading-relaxed max-w-sm text-lg">
              Empowering the next generation of builders, shapers, and
              innovators at the University of Auckland.
            </p>
          </div>

          {/* Quick links */}
          <div className="space-y-6">
            <h3 className="font-bold text-lg text-white">Navigate</h3>
            <div className="flex flex-col gap-4">
              <a
                href="/pages/about"
                className="text-base text-background/70 hover:text-white transition-colors w-fit font-semibold"
              >
                About
              </a>
              <a
                href="/pages/events"
                className="text-base text-background/70 hover:text-white transition-colors w-fit font-semibold"
              >
                Events
              </a>
              <a
                href="/pages/partners"
                className="text-base text-background/70 hover:text-white transition-colors w-fit font-semibold"
              >
                Partners
              </a>
              <a
                href="https://forms.gle/vzRb7t46SPBUwi7v8"
                target="_blank"
                rel="noopener noreferrer"
                className="text-base text-primary hover:text-primary/80 transition-colors w-fit font-bold"
              >
                Join the Club
              </a>
            </div>
          </div>

          {/* Connect */}
          <div className="space-y-6">
            <h3 className="font-bold text-lg text-white">Connect</h3>
            <div className="flex gap-4">
              <a
                href="https://instagram.com/web3uoa"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center text-white hover:bg-primary transition-colors duration-300"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://x.com/web3uoa"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center text-white hover:bg-primary transition-colors duration-300"
                aria-label="X (Twitter)"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/web3uoa-university-of-auckland-web3-club/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center text-white hover:bg-primary transition-colors duration-300"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
            <a
              href="mailto:team@web3uoa.nz"
              className="text-base text-background/70 hover:text-white transition-colors block w-fit font-medium"
            >
              team@web3uoa.nz
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-8 border-t border-background/20 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 sm:gap-4 text-sm text-background/50 font-medium text-center">
          <p>&copy; {new Date().getFullYear()} WEB3UOA. All rights reserved.</p>
          <p>University of Auckland Web3 Club</p>
        </div>
      </div>
    </footer>
  );
}
