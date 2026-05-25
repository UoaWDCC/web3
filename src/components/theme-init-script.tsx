"use client";

import { useServerInsertedHTML } from "next/navigation";

const themeInitScript = `
  (function() {
    try {
      var saved = localStorage.getItem("theme");
      var preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      var theme = saved || preferred;

      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      }
    } catch (error) {}
  })();
`;

export function ThemeInitScript() {
  useServerInsertedHTML(() => (
    <script
      id="theme-init"
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
    />
  ));

  return null;
}
