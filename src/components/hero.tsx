import { Button } from "@/components/ui/button";
import { Instagram, Linkedin, ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden border-b border-border/50">
      <div className="container relative z-12 px-25 pt-65 pb-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-16">
          {/* Hero text (left side) */}
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-[7rem] font-black tracking-tight leading-[1.05]">
              <span className="text-web3 font-russo">WEB3 </span>
              <span className="text-uoa font-russo">UOA</span>
            </h1>
            <p className="text-hero-text text-xl md:text-2xl font-medium tracking-wide max-w-2xl mx-auto lg:mx-0">
              The next generation of blockchain innovators
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4 pt-4">
              <Button
                size="lg"
                className="text-base px-8 h-14 border-2 transition-all rounded-xl font-bold !bg-nav-bg !border-button-bor !text-button-bor hover:!bg-button-bor hover:!text-white hover:!border-button-bor"
                asChild
              >
                <a
                  href="https://forms.gle/vzRb7t46SPBUwi7v8"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join the Club
                </a>
              </Button>
              <Button
                size="lg"
                className="text-base px-8 h-14 border-2 transition-all rounded-xl font-bold !bg-nav-bg !border-button-bor !text-button-bor hover:!bg-button-bor hover:!text-white hover:!border-button-bor"
                asChild
              >
                <a href="#about">Learn More</a>
              </Button>
            </div>

            <div className="flex items-center lg:justify-start justify-center gap-8 pt-8">
              <a
                href="https://instagram.com/web3uoa"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors transform duration-200 transition-transform hover:-translate-y-1 dark:text-white dark:hover:text-primary"
                aria-label="Instagram"
              >
                <Instagram className="w-6 h-6" />
              </a>
              <a
                href="https://x.com/web3uoa"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors transform duration-200 transition-transform hover:-translate-y-1 dark:text-white dark:hover:text-primary"
                aria-label="X (Twitter)"
              >
                <svg
                  className="w-6 h-6"
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
                className="text-muted-foreground hover:text-primary transition-colors transform duration-200 transition-transform hover:-translate-y-1 dark:text-white dark:hover:text-primary"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-6 h-6" />
              </a>
            </div>
          </div>

          {/* Logo element (right side) */}
          <div className="flex-1 flex justify-center lg:justify-end items-center relative">
            {/* The cube effect */}
            <a
              href="#identity"
              className="relative group w-64 h-64 md:w-96 md:h-96 block cursor-pointer"
              title="Claim your Web3 ID!"
            >
              {/* Back subtle shadow */}
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-[100px] transition-all duration-700 group-hover:bg-primary/20" />

              <img
                src="/logo/web3uoa_logo.png"
                alt="WEB3UOA Logo Cube"
                className="w-full h-full object-contain drop-shadow-2xl animate-[float_4s_ease-in-out_infinite] transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-[10deg]"
                style={{
                  filter: "drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))",
                }}
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
