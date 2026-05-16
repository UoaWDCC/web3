"use client";
import { Sun, Moon } from 'lucide-react'
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useAccount } from "wagmi";
import { isAllowedAdminAddress } from "@/lib/admin-auth";
import Link from "next/link";
import { usePathname } from 'next/navigation';  


const navLinks = [
  { label: "About", href: "/pages/about" },
  { label: "Events", href: "/pages/events" },
  { label: "Partners", href: "/pages/partners" },
  // { label: "Claim your Web3 ID!", href: "/pages/claim-id", isCTA: true },
  // { label: "About", href: "#about" },
  // { label: "Events", href: "#events" },
  // { label: "Partners", href: "#partners" },
  { label: "Search", href: "#search" }, // TODO: add search page
  { label: "Join Us", href: "#join_us" }, // TODO: add Us
  { label: "Connect Wallet", href: "/pages/claim-id" }, // TODO: add wallet connection
  //{ label: "Claim your Web3 ID!", href: "#identity", isCTA: true }  // not sure if need 
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);
  const { address } = useAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  // save theme preference to localStorage for persistence across sessions
  // read saved preference (client only)
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(saved || preferred);
  }, []);

  // Apply theme + save it whenever it changes for the theme 
  useEffect(() => {
    document.documentElement.classList.add('theme-transitioning');

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    localStorage.setItem("theme", theme); // ← this saves it

    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 300);
  }, [theme]);

  const isAdmin = mounted && isAllowedAdminAddress(address);

  // Determine active link based on current pathname. Exact match or sub-route match counts as active.
  // Will need to change the code after we add the search page and join us page
  // currently they are just anchors on the home page so they won't be active when user is on the home page
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href.startsWith("#")) return false;

    // exact match OR sub-route match
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="absolute z-50 bg-nav-bg border-b border-white/10
      w-[95%] sm:w-[90%] lg:w-[80%]
      left-1/2 -translate-x-1/2 top-[3%] sm:top-[5%]
      rounded-full text-nav-text shadow-lg">

      <div className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
          <img
            src="/logo/web3uoa_logo.png"
            alt="WEB3UOA"
            className="w-8 h-8 sm:w-10 sm:h-10 transition-transform duration-500 group-hover:scale-110 drop-shadow-sm"
          />
          <span className="text-nav-text text-lg sm:text-xl font-black tracking-tight font-russo">WEB3UOA</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-5 xl:gap-15 flex-shrink-0 ml-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              // frist state is true if active so the text is highlighted, second state is hover state for non-active links
              className={`nav-bar-text text-base font-semibold tracking-wide transition-colors duration-100 whitespace-nowrap ${
                isActive(link.href) ? "text-nav-text-hover" : "hover:text-nav-text-hover"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className="text-sm font-bold tracking-wide transition-colors text-yellow-500 hover:text-yellow-400 whitespace-nowrap"
            >
              Admin Panel
            </Link>
          )}

          {/* toggle_theme button */}
          <Button
            size="sm"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="text-text bg-transparent hover:bg-transparent active:bg-transparent focus-visible:ring-0 flex-shrink-0 hover:cursor-pointer"
          >
            <span className="relative h-6 w-6 block">
              {/* fade in and out animation */}
              <Sun className="absolute inset-0 size-6 transition-opacity duration-300" style={{ opacity: theme === "light" ? 1 : 0 }} />
              <Moon className="absolute inset-0 size-6 transition-opacity duration-300" style={{ opacity: theme === "light" ? 0 : 1 }} />
            </span>
          </Button>
        </div>
        
        {/* Mobile menu button */}
        <div className="lg:hidden flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="text-text bg-transparent hover:bg-transparent active:bg-transparent focus-visible:ring-0 flex-shrink-0 hover:cursor-pointer"
          >
            <span className="relative h-6 w-6 block">
              {/* fade in and out animation */}
              <Sun className="absolute inset-0 size-6 transition-opacity duration-300" style={{ opacity: theme === "light" ? 1 : 0 }} />
              <Moon className="absolute inset-0 size-6 transition-opacity duration-300" style={{ opacity: theme === "light" ? 0 : 1 }} />
            </span>
          </Button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-nav-text transition-colors hover:bg-white/10"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 mt-2 bg-nav-bg backdrop-blur-md border border-white/10 shadow-lg rounded-2xl overflow-hidden">
          <div className="px-6 py-5 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`text-base font-semibold tracking-wide py-2.5 px-3 rounded-lg transition-all ${
                  isActive(link.href)
                    ? "text-nav-text-hover bg-white/10"
                    : "text-nav-text hover:bg-white/10 hover:text-nav-text-hover"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="text-base font-bold text-yellow-500 hover:text-yellow-400 py-2.5 px-3 rounded-lg transition-colors hover:bg-white/10"
              >
                Admin Panel
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}