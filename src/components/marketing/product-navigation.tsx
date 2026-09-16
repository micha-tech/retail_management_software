"use client";

import { useEffect, useState } from "react";
import styles from "@/app/(marketing)/home.module.css";

export function ProductNavigation({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const update = () => {
      const line = window.innerHeight * 0.4;
      const current = items.filter(item => {
        const rect = document.getElementById(item.id)?.getBoundingClientRect();
        return rect && rect.top <= line;
      }).at(-1);
      setActive(current?.id ?? items[0]?.id);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [items]);
  return <nav className={styles.productNav} aria-label="Explore product capabilities">{items.map(item => <a key={item.id} href={`#${item.id}`} aria-current={active === item.id ? "location" : undefined} onClick={() => setActive(item.id)}>{item.label}</a>)}</nav>;
}
