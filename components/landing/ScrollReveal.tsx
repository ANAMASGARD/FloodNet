"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right";
  className?: string;
  once?: boolean;
}

export function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  className,
  once = true,
}: ScrollRevealProps) {
  const initial =
    direction === "up"
      ? { opacity: 0, y: 50 }
      : direction === "left"
        ? { opacity: 0, x: -60 }
        : { opacity: 0, x: 60 };

  const animate =
    direction === "up"
      ? { opacity: 1, y: 0 }
      : direction === "left"
        ? { opacity: 1, x: 0 }
        : { opacity: 1, x: 0 };

  return (
    <motion.div
      initial={initial}
      whileInView={animate}
      viewport={{ once, margin: "-80px" }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
