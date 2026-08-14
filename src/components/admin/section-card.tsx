import type { ReactNode } from "react";

/**
 * Blue panel that groups one area of admin functionality.
 *
 * The background is the inverse of the --color-web3 swap (light blue in light
 * mode, brand blue in dark), which no existing token covers, so it is set
 * explicitly. The heading is `text-web3`, which already swaps the other way.
 */
export function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] bg-[#A3DEF4] p-6 shadow-sm md:p-8 dark:bg-[#3F65E2]">
      <h2 className="mb-6 text-2xl font-bold text-web3">{title}</h2>
      {children}
    </section>
  );
}
