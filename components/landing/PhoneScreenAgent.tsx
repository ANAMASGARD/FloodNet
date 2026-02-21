"use client";

import { Bot, Send, User } from "lucide-react";

/* ─── AI Agent chat screen rendered inside a phone mockup ─── */
export function PhoneScreenAgent() {
  const messages = [
    {
      from: "ai",
      text: "Flood alert triggered. Sector 7 — water levels rising rapidly past 3.2m threshold. Initiating response protocol.",
      time: "14:23",
    },
    {
      from: "user",
      text: "Confirmed. River gauge at 4.1m and rising. 12 families in low-lying area.",
      time: "14:24",
    },
    {
      from: "ai",
      text: "High-priority flood zone. Dispatching Response Team 7. Nearest safe zone: Central Relief Hub — capacity available. ETA 4 minutes.",
      time: "14:24",
    },
    {
      from: "user",
      text: "Deploying sandbags at breach point. Evacuation route Alpha clear.",
      time: "14:25",
    },
  ];

  return (
    <div className="h-full w-full flex flex-col px-3 py-2 text-white text-[10px] leading-tight font-sans">
      {/* Chat header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
        <div className="w-6 h-6 bg-red-500/20 rounded-full border border-red-500/40 flex items-center justify-center">
          <Bot size={12} className="text-red-400" />
        </div>
        <div>
          <p className="font-head text-[10px]">FloodNet Agent</p>
          <p className="text-[7px] text-green-400">● Active · Flood Mode</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col gap-2 overflow-hidden">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-1.5 ${msg.from === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              msg.from === "ai"
                ? "bg-red-500/20 border border-red-500/40"
                : "bg-blue-500/20 border border-blue-500/40"
            }`}>
              {msg.from === "ai" ? (
                <Bot size={8} className="text-red-400" />
              ) : (
                <User size={8} className="text-blue-400" />
              )}
            </div>
            <div className={`max-w-[80%] p-2 rounded-xl text-[9px] leading-relaxed ${
              msg.from === "ai"
                ? "bg-white/5 border border-white/10 text-white/80"
                : "bg-blue-600/20 border border-blue-500/30 text-blue-100"
            }`}>
              <p>{msg.text}</p>
              <p className={`text-[7px] mt-1 ${msg.from === "ai" ? "text-white/30" : "text-blue-300/50"}`}>{msg.time}</p>
            </div>
          </div>
        ))}

        {/* AI typing indicator */}
        <div className="flex gap-1.5">
          <div className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 mt-0.5">
            <Bot size={8} className="text-red-400" />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-red-400/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 bg-red-400/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 bg-red-400/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
        <div className="flex-1 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
          <p className="text-white/30 text-[9px]">Report conditions...</p>
        </div>
        <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center">
          <Send size={10} className="text-white" />
        </div>
      </div>
    </div>
  );
}
