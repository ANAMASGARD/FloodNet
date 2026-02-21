"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Brain,
  Hospital,
  Ambulance,
  Activity,
  User,
  Zap,
} from "lucide-react";

interface NodeDiagramProps {
  connected: boolean;
  className?: string;
}

const nodes = [
  { id: "brain", x: 200, y: 150, icon: Brain, label: "MEDI DEV AI", color: "#EF4444", bg: "#EF4444" },
  { id: "hospital", x: 70, y: 60, icon: Hospital, label: "Hospital", color: "#22C55E", bg: "#22C55E" },
  { id: "ambulance", x: 340, y: 60, icon: Ambulance, label: "EMS", color: "#3B82F6", bg: "#3B82F6" },
  { id: "patient", x: 70, y: 250, icon: User, label: "Patient", color: "#F97316", bg: "#F97316" },
  { id: "vitals", x: 340, y: 250, icon: Activity, label: "Vitals", color: "#A855F7", bg: "#A855F7" },
];

const connections = [
  { from: "brain", to: "hospital" },
  { from: "brain", to: "ambulance" },
  { from: "brain", to: "patient" },
  { from: "brain", to: "vitals" },
  { from: "hospital", to: "ambulance" },
  { from: "patient", to: "vitals" },
];

function getNode(id: string) {
  return nodes.find((n) => n.id === id)!;
}

export function NodeDiagram({ connected, className }: NodeDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <svg viewBox="0 0 410 310" className="w-full h-auto max-w-md mx-auto">
        {/* Background glow for center node */}
        {connected && (
          <motion.circle
            cx={200}
            cy={150}
            r={60}
            fill="url(#centerGlow)"
            initial={{ opacity: 0, r: 20 }}
            animate={isInView ? { opacity: 0.3, r: 60 } : {}}
            transition={{ duration: 1.2, delay: 0.5 }}
          />
        )}

        <defs>
          <radialGradient id="centerGlow">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Connection lines */}
        {connections.map(({ from, to }, i) => {
          const a = getNode(from);
          const b = getNode(to);

          return (
            <motion.line
              key={`${from}-${to}`}
              x1={a.x}
              y1={a.y}
              x2={connected ? b.x : a.x + (b.x - a.x) * 0.3}
              y2={connected ? b.y : a.y + (b.y - a.y) * 0.3}
              stroke={connected ? a.color : "#6B7280"}
              strokeWidth={connected ? 2 : 1}
              strokeDasharray={connected ? "0" : "4 6"}
              opacity={connected ? 0.6 : 0.25}
              initial={{
                pathLength: 0,
                opacity: 0,
              }}
              animate={
                isInView
                  ? {
                      pathLength: 1,
                      opacity: connected ? 0.6 : 0.25,
                    }
                  : {}
              }
              transition={{
                duration: 0.8,
                delay: connected ? 0.3 + i * 0.12 : 0.2 + i * 0.08,
                ease: "easeOut",
              }}
            />
          );
        })}

        {/* Data pulse animations on connected lines */}
        {connected &&
          connections.map(({ from, to }, i) => {
            const a = getNode(from);
            const b = getNode(to);
            return (
              <motion.circle
                key={`pulse-${from}-${to}`}
                r={3}
                fill={a.color}
                initial={{ opacity: 0 }}
                animate={
                  isInView
                    ? {
                        cx: [a.x, b.x],
                        cy: [a.y, b.y],
                        opacity: [0, 1, 1, 0],
                      }
                    : {}
                }
                transition={{
                  duration: 2,
                  delay: 1.5 + i * 0.3,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: "easeInOut",
                }}
              />
            );
          })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const Icon = node.icon;
          const isCenter = node.id === "brain";
          const nodeSize = isCenter ? 28 : 22;

          return (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{
                duration: 0.5,
                delay: i * 0.1,
                type: "spring",
                stiffness: 200,
              }}
            >
              {/* Node circle background */}
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeSize}
                fill={connected ? node.bg : "#374151"}
                opacity={connected ? 0.15 : 0.1}
                stroke={connected ? node.color : "#6B7280"}
                strokeWidth={connected ? 2 : 1}
              />

              {/* Outer ring for center */}
              {isCenter && connected && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={36}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 0.4, rotate: 360 } : {}}
                  transition={{
                    opacity: { duration: 0.5, delay: 0.5 },
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  }}
                  style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                />
              )}

              {/* Icon */}
              <foreignObject
                x={node.x - 10}
                y={node.y - 10}
                width={20}
                height={20}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <Icon
                    size={isCenter ? 14 : 12}
                    color={connected ? node.color : "#9CA3AF"}
                  />
                </div>
              </foreignObject>

              {/* Label */}
              <text
                x={node.x}
                y={node.y + nodeSize + 14}
                textAnchor="middle"
                className="text-[10px] font-sans fill-current"
                fill={connected ? node.color : "#9CA3AF"}
              >
                {node.label}
              </text>
            </motion.g>
          );
        })}

        {/* Disconnected X marks */}
        {!connected && (
          <>
            {connections.slice(0, 3).map(({ from, to }, i) => {
              const a = getNode(from);
              const b = getNode(to);
              const midX = a.x + (b.x - a.x) * 0.5;
              const midY = a.y + (b.y - a.y) * 0.5;
              return (
                <motion.g
                  key={`x-${from}-${to}`}
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 0.5 } : {}}
                  transition={{ delay: 0.8 + i * 0.15 }}
                >
                  <line x1={midX - 4} y1={midY - 4} x2={midX + 4} y2={midY + 4} stroke="#EF4444" strokeWidth={2} />
                  <line x1={midX + 4} y1={midY - 4} x2={midX - 4} y2={midY + 4} stroke="#EF4444" strokeWidth={2} />
                </motion.g>
              );
            })}
          </>
        )}
      </svg>

      {/* Status label */}
      <div className="text-center mt-3">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans border ${
            connected
              ? "bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400"
              : "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400"
          }`}
        >
          {connected ? (
            <>
              <Zap size={12} />
              Fully Connected
            </>
          ) : (
            <>
              <AlertIcon />
              Fragmented System
            </>
          )}
        </span>
      </div>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
