/** Layout constants shared by the admin layout and its pages. */

export const pageShell = "min-h-screen pt-28";

export const panelShell =
  "mx-auto mb-12 mt-12 w-[calc(100%-2rem)] rounded-3xl bg-nav-bg p-5 shadow-xl " +
  "sm:mb-16 sm:mt-16 sm:w-[90%] sm:rounded-[40px] sm:p-8 " +
  "md:mb-20 md:p-12 lg:w-[85%] lg:p-14 xl:w-[80%]";

// The site's standard button, for controls sitting on the panel (not on a card).
export const siteButtonClass =
  "h-12 rounded-xl border-2 px-8 font-bold transition-all " +
  "!bg-nav-bg !border-button-bor !text-button-bor " +
  "hover:!bg-button-bor hover:!text-white hover:!border-button-bor";
