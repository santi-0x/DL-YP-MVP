import type { ReactNode } from "react";

const TRAILER_ID = "vgqG3ITMv1Q";

const src = [
  "https://www.youtube-nocookie.com/embed/",
  TRAILER_ID,
  "?autoplay=1&mute=1&controls=0&loop=1&playlist=",
  TRAILER_ID,
  "&rel=0&modestbranding=1&playsinline=1&fs=0",
].join("");

export function FilmBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#1c140e]">
        <iframe
          title="The Big Short official trailer, Paramount Pictures"
          src={src}
          className="absolute left-1/2 top-1/2 aspect-video w-[120vw] min-w-[180vh] -translate-x-1/2 -translate-y-1/2"
          allow="autoplay; encrypted-media"
          tabIndex={-1}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,244,234,0.22),rgba(255,244,234,0.38)_36%,rgba(255,244,234,0.55))]" />
      <div className="relative">{children}</div>
    </div>
  );
}
