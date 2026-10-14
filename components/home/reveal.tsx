"use client";

import { useEffect, useRef } from "react";

// Oculta (.armed) solo tras montar y muestra (.in) al entrar en viewport; sin JS/IntersectionObserver queda visible.
export function Reveal({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    el.classList.add("armed");
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className={className + " reveal"}>
      {children}
    </section>
  );
}
