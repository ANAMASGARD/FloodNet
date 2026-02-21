"use client";

import { motion } from "framer-motion";

interface AnimatedHeadingProps {
  className?: string;
}

export function AnimatedHeading({ className }: AnimatedHeadingProps) {
  const line1 = "Every Second";
  const word2 = "Saves";
  const line3 = "a Life";

  return (
    <motion.h1
      className={`font-head text-5xl sm:text-6xl lg:text-[5.5rem] xl:text-[6.5rem] leading-[0.92] tracking-tight mb-5 ${className ?? ""}`}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.035, delayChildren: 0.1 } },
      }}
    >
      {/* Line 1: "Every Second" */}
      <span className="block overflow-hidden pb-1">
        {line1.split("").map((char, i) => (
          <motion.span
            key={`l1-${i}`}
            className="inline-block"
            style={{ display: char === " " ? "inline" : "inline-block" }}
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </span>

      {/* "Saves" — highlighted word with gradient */}
      <span className="block overflow-hidden pb-2">
        {word2.split("").map((char, i) => (
          <motion.span
            key={`w2-${i}`}
            className="inline-block bg-gradient-to-r from-primary via-red-500 to-orange-500 bg-clip-text text-transparent"
            variants={{
              hidden: { opacity: 0, y: 60, scale: 0.9 },
              visible: { opacity: 1, y: 0, scale: 1 },
            }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {char}
          </motion.span>
        ))}
      </span>

      {/* Line 3: "a Life" */}
      <span className="block overflow-hidden pb-1">
        {line3.split("").map((char, i) => (
          <motion.span
            key={`l3-${i}`}
            className="inline-block"
            style={{ display: char === " " ? "inline" : "inline-block" }}
            variants={{
              hidden: { opacity: 0, y: 50 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </span>

      {/* Animated underline accent */}
      <motion.div
        className="mx-auto mt-1"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: "6rem", opacity: 1 }}
        transition={{ delay: 1, duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
      >
        <svg viewBox="0 0 120 12" className="w-full h-3">
          <motion.path
            d="M2,6 Q30,2 60,6 Q90,10 118,6"
            fill="none"
            stroke="url(#underlineGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="underlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
    </motion.h1>
  );
}
