/** Layout constants shared by the admin layout and its pages. */

export const pageShell = "min-h-screen pt-28";

// Width tracks the navbar, matching the events page.
export const panelShell =
  "mx-auto mb-20 mt-20 w-[95%] rounded-[48px] bg-nav-bg p-8 shadow-xl " +
  "sm:w-[90%] md:p-16 lg:w-[85%] xl:w-[80%]";

// The site's standard button, for controls sitting on the panel (not on a card).
export const siteButtonClass =
  "h-12 rounded-xl border-2 px-8 font-bold transition-all " +
  "!bg-nav-bg !border-button-bor !text-button-bor " +
  "hover:!bg-button-bor hover:!text-white hover:!border-button-bor";
