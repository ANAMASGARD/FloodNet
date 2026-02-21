"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Brain,
  Clock,
  Heart,
  Hospital,
  Ambulance,
  MapPin,
  Moon,
  Shield,
  Sun,
  Zap,
  Radio,
  Stethoscope,
  Users,
  BarChart3,
} from "lucide-react";

import { Button } from "@/components/retroui/Button";
import { Card } from "@/components/retroui/Card";
import { Badge } from "@/components/retroui/Badge";
import { Text } from "@/components/retroui/Text";
import { Switch } from "@/components/retroui/Switch";

import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { StatsCounter } from "@/components/landing/StatsCounter";
import { HealthScoreRing } from "@/components/landing/HealthScoreRing";
import { PhoneMockup } from "@/components/landing/PhoneMockup";
import { PhoneScreenDashboard } from "@/components/landing/PhoneScreenDashboard";
import { PhoneScreenEmergency } from "@/components/landing/PhoneScreenEmergency";
import { PhoneScreenAgent } from "@/components/landing/PhoneScreenAgent";
import { NodeDiagram } from "@/components/landing/NodeDiagram";
import { CrisisMap } from "@/components/landing/CrisisMap";
import { AnimatedHeading } from "@/components/landing/AnimatedHeading";

/* ═══════════════════════════════════════════════════════════════════════════
   MEDI DEV — Landing Page
   Pomegranate Health inspired · Neo-brutalism · RetroUI Components
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ─── STICKY NAV ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b-2 border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary pulse-dot" />
            <Text as="h4" className="!text-lg tracking-wide">
              MEDI DEV
            </Text>
          </div>

          {/* Nav links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => document.getElementById("crisis")?.scrollIntoView({ behavior: "smooth" })}>
              The Problem
            </Button>
            <Button variant="ghost" size="sm" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              Features
            </Button>
            <Button variant="ghost" size="sm" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
              How It Works
            </Button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sun size={14} className="text-muted-foreground" />
              <Switch
                checked={dark}
                onCheckedChange={setDark}
              />
              <Moon size={14} className="text-muted-foreground" />
            </div>
            <Button size="sm" className="hidden sm:flex">
              Get Started
              <ArrowRight size={14} className="ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center pt-20 pb-10 px-4">
        {/* Ambient gradient orbs */}
        <div className="gradient-orb w-[500px] h-[500px] bg-red-500 top-[-10%] left-[-10%]" />
        <div className="gradient-orb w-[400px] h-[400px] bg-orange-400 bottom-[5%] right-[-5%]" />
        <div className="gradient-orb w-[300px] h-[300px] bg-yellow-300 top-[20%] right-[15%]" />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Main headline — animated */}
          <AnimatedHeading />

          {/* Subtitle */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <Text as="p" className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg mb-8">
              MEDI DEV coordinates AI agents, hospitals, and first responders in real-time
              to optimize the <span className="text-primary font-semibold">Golden Hour</span> — 
              the critical window that determines patient survival.
            </Text>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
          >
            <Button size="lg" className="w-full sm:w-auto">
              Launch Dashboard
              <ArrowRight size={18} className="ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
              See How It Works
            </Button>
          </motion.div>

          {/* Phone mockups */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-[-20px] relative">
            <PhoneMockup rotation={-6} delay={0.5} className="z-10">
              <PhoneScreenDashboard />
            </PhoneMockup>
            <PhoneMockup rotation={6} delay={0.7} className="md:-ml-8 z-20">
              <PhoneScreenEmergency />
            </PhoneMockup>
          </div>
        </div>

        {/* Heartbeat line across bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 overflow-hidden opacity-20">
          <svg viewBox="0 0 1200 40" className="w-full h-full" preserveAspectRatio="none">
            <polyline
              points="0,20 100,20 120,20 130,5 140,35 150,10 160,30 170,20 200,20 400,20 420,20 430,5 440,35 450,10 460,30 470,20 500,20 700,20 720,20 730,5 740,35 750,10 760,30 770,20 800,20 1000,20 1020,20 1030,5 1040,35 1050,10 1060,30 1070,20 1100,20 1200,20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary heartbeat-line"
            />
          </svg>
        </div>
      </section>

      {/* ─── TRUSTED-BY / STATS BAR ─── */}
      <section className="relative border-y-2 border-border bg-muted/50 py-8">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: 10000, suffix: "+", label: "Patients Served", prefix: "" },
            { value: 4, suffix: " min", label: "Avg Response Time", prefix: "" },
            { value: 99, suffix: "%", label: "Coordination Accuracy", prefix: "" },
            { value: 150, suffix: "+", label: "Connected Hospitals", prefix: "" },
          ].map((stat, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className="flex flex-col items-center">
                <StatsCounter
                  to={stat.value}
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                  className="font-head text-3xl sm:text-4xl text-primary"
                />
                <span className="text-xs sm:text-sm text-muted-foreground mt-1 font-sans">
                  {stat.label}
                </span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ─── THE CRISIS (Problem Section) ─── */}
      <section id="crisis" className="relative py-16 sm:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header row */}
          <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <Badge variant="surface" size="sm" className="mb-2 inline-flex items-center gap-1.5">
                  <Heart size={10} />
                  The Problem
                </Badge>
                <Text as="h2" className="!text-2xl sm:!text-3xl !leading-tight">
                  Emergency Response is{" "}
                  <span className="text-primary">Broken</span>
                </Text>
              </div>
              {/* Inline stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <StatsCounter to={38} suffix=" min" className="font-head text-xl text-primary block" />
                  <span className="text-[10px] text-muted-foreground">Avg rural response</span>
                </div>
                <div className="text-center">
                  <StatsCounter to={250} suffix="K" className="font-head text-xl text-primary block" />
                  <span className="text-[10px] text-muted-foreground">Preventable deaths/yr</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Full-width map */}
          <ScrollReveal delay={0.15}>
            <CrisisMap className="h-[450px] sm:h-[500px] lg:h-[560px] shadow-lg" />
          </ScrollReveal>
        </div>
      </section>

      {/* ─── THE SOLUTION ─── */}
      <section className="relative py-20 sm:py-28 px-4 gradient-warm-subtle">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Diagram — Left */}
          <ScrollReveal direction="left" className="order-2 md:order-1">
            <NodeDiagram connected={true} />
          </ScrollReveal>

          {/* Text — Right */}
          <ScrollReveal direction="right" delay={0.2} className="order-1 md:order-2">
            <div>
              <Badge variant="surface" size="md" className="mb-4 inline-flex items-center gap-1.5">
                <Brain size={12} />
                The Solution
              </Badge>
              <Text as="h2" className="mb-4 !leading-tight">
                One AI Brain.{" "}
                <span className="text-primary">Every Responder</span> Connected.
              </Text>
              <Text as="p" className="text-muted-foreground mb-6 text-base leading-relaxed">
                MEDI DEV&apos;s AI orchestration engine connects every node in the emergency
                response chain — from the moment an incident is detected to the patient
                reaching definitive care. Real-time. Intelligent. Life-saving.
              </Text>

              <div className="grid grid-cols-2 gap-4">
                <Card className="!inline-block w-full">
                  <Card.Content className="!p-4 text-center">
                    <StatsCounter to={4} suffix=" min" className="font-head text-2xl text-primary block" />
                    <span className="text-xs text-muted-foreground">AI-optimized response</span>
                  </Card.Content>
                </Card>
                <Card className="!inline-block w-full">
                  <Card.Content className="!p-4 text-center">
                    <StatsCounter to={99} suffix=".7%" className="font-head text-2xl text-primary block" />
                    <span className="text-xs text-muted-foreground">Coordination accuracy</span>
                  </Card.Content>
                </Card>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── FEATURES BENTO GRID ─── */}
      <section id="features" className="relative py-20 sm:py-28 px-4">
        <div className="gradient-orb w-[600px] h-[600px] bg-orange-400 top-[-10%] right-[-10%]" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-14">
              <Badge variant="solid" size="md" className="mb-4 inline-flex items-center gap-1.5">
                <Zap size={12} />
                Features
              </Badge>
              <Text as="h2" className="mb-3">
                Intelligent Emergency Orchestration
              </Text>
              <Text as="p" className="text-muted-foreground max-w-xl mx-auto">
                A unified AI platform that transforms chaotic emergency response
                into coordinated precision medicine.
              </Text>
            </div>
          </ScrollReveal>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1 — Triage AI (spans 2 on lg) */}
            <ScrollReveal delay={0} className="lg:col-span-2">
              <Card className="!inline-block w-full h-full">
                <Card.Header>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                      <Brain size={16} className="text-red-500" />
                    </div>
                    <Card.Title>AI Triage Engine</Card.Title>
                  </div>
                  <Card.Description>
                    Instant severity scoring powered by multi-modal AI analysis
                  </Card.Description>
                </Card.Header>
                <Card.Content>
                  {/* Mini chart visualization */}
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <div className="flex items-end gap-1 h-24">
                      {[35, 55, 42, 78, 92, 65, 88, 45, 72, 95, 60, 82, 70, 55, 90, 48, 76, 85].map((h, i) => (
                        <motion.div
                          key={i}
                          className="flex-1 rounded-t"
                          style={{
                            background: h > 75 ? "#EF4444" : h > 50 ? "#F97316" : "#22C55E",
                          }}
                          initial={{ height: 0 }}
                          whileInView={{ height: `${h}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: 0.8 + i * 0.04 }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                      <span>Low priority</span>
                      <span>Critical</span>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </ScrollReveal>

            {/* Card 2 — Health Score */}
            <ScrollReveal delay={0.1}>
              <Card className="!inline-block w-full h-full">
                <Card.Header>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                      <Activity size={16} className="text-green-500" />
                    </div>
                    <Card.Title>Health Score</Card.Title>
                  </div>
                  <Card.Description>Real-time patient health assessment</Card.Description>
                </Card.Header>
                <Card.Content className="flex justify-center py-2">
                  <HealthScoreRing score={94} />
                </Card.Content>
              </Card>
            </ScrollReveal>

            {/* Card 3 — Live Dispatch (improved with animated routes) */}
            <ScrollReveal delay={0.15}>
              <Card className="!inline-block w-full h-full">
                <Card.Header>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                      <Ambulance size={16} className="text-blue-500" />
                    </div>
                    <Card.Title>Live Dispatch</Card.Title>
                  </div>
                  <Card.Description>Real-time GPS routing & unit tracking</Card.Description>
                </Card.Header>
                <Card.Content>
                  {/* Animated dispatch visualization */}
                  <div className="relative bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-xl overflow-hidden border border-blue-500/20" style={{ height: 160 }}>
                    {/* Radial grid */}
                    <svg className="absolute inset-0 w-full h-full">
                      <defs>
                        <radialGradient id="gridGlow" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                      <rect fill="url(#gridGlow)" width="100%" height="100%" />
                      {/* Concentric rings */}
                      {[30, 55, 80].map((r, i) => (
                        <circle key={i} cx="50%" cy="50%" r={`${r}%`} fill="none" stroke="#3B82F6" strokeWidth="0.5" opacity="0.15" />
                      ))}
                      {/* Cross hairs */}
                      <line x1="50%" y1="10%" x2="50%" y2="90%" stroke="#3B82F6" strokeWidth="0.5" opacity="0.12" />
                      <line x1="10%" y1="50%" x2="90%" y2="50%" stroke="#3B82F6" strokeWidth="0.5" opacity="0.12" />
                      {/* Animated route paths */}
                      <motion.path
                        d="M70,120 Q100,80 140,60"
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        initial={{ pathLength: 0, opacity: 0 }}
                        whileInView={{ pathLength: 1, opacity: 0.7 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8, duration: 1.5, ease: "easeInOut" }}
                      />
                      <motion.path
                        d="M200,130 Q170,90 140,60"
                        fill="none"
                        stroke="#22C55E"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                        initial={{ pathLength: 0, opacity: 0 }}
                        whileInView={{ pathLength: 1, opacity: 0.7 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.0, duration: 1.5, ease: "easeInOut" }}
                      />
                    </svg>

                    {/* Central hospital target */}
                    <motion.div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/50 flex items-center justify-center z-10"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5, type: "spring" }}
                    >
                      <Hospital size={14} className="text-green-400" />
                    </motion.div>

                    {/* Ambulance units */}
                    {[
                      { top: "72%", left: "22%", label: "AMB-01", eta: "4m" },
                      { top: "78%", left: "72%", label: "AMB-02", eta: "7m" },
                    ].map((unit, i) => (
                      <motion.div
                        key={unit.label}
                        className="absolute flex items-center gap-1 z-10"
                        style={{ top: unit.top, left: unit.left }}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.2 + i * 0.2, type: "spring" }}
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-500/30 border border-blue-400/60 flex items-center justify-center">
                          <Ambulance size={10} className="text-blue-300" />
                        </div>
                        <div className="bg-blue-500/20 backdrop-blur-sm rounded px-1.5 py-0.5 border border-blue-500/30">
                          <span className="text-[7px] text-blue-300 font-mono">{unit.label} · {unit.eta}</span>
                        </div>
                      </motion.div>
                    ))}

                    {/* Emergency pulse */}
                    <motion.div
                      className="absolute top-[25%] left-[45%] w-3 h-3 rounded-full bg-red-500 pulse-dot z-10"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.6 }}
                    />
                  </div>

                  {/* Dispatch stats */}
                  <div className="flex items-center justify-between mt-3 text-[10px]">
                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 pulse-dot" />
                      2 units dispatched
                    </div>
                    <div className="text-muted-foreground">
                      ETA: <span className="font-head text-foreground">4 min</span>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            </ScrollReveal>

            {/* Card 4 — Hospital Matching (spans 2 on lg) */}
            <ScrollReveal delay={0.2} className="lg:col-span-2">
              <Card className="!inline-block w-full h-full">
                <Card.Header>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                      <Hospital size={16} className="text-purple-500" />
                    </div>
                    <Card.Title>Hospital Matching</Card.Title>
                  </div>
                  <Card.Description>AI-powered bed availability and capability matching</Card.Description>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-2.5">
                    {[
                      { name: "City General", beds: 12, capacity: 78, specialty: "Cardiac", eta: "4 min" },
                      { name: "St. Mary's Trauma", beds: 5, capacity: 92, specialty: "Trauma", eta: "7 min" },
                      { name: "University Medical", beds: 8, capacity: 65, specialty: "Neuro", eta: "11 min" },
                    ].map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg border"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.9 + i * 0.15 }}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 border-2 flex items-center justify-center text-xs font-head text-primary shrink-0">
                          H{i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-head truncate">{h.name}</span>
                            <Badge variant="default" size="sm">{h.beds} beds</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${h.capacity}%`,
                                  background: h.capacity > 85 ? "#EF4444" : h.capacity > 70 ? "#F97316" : "#22C55E",
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">{h.capacity}%</span>
                            <Badge variant="outline" size="sm" className="!text-[10px] shrink-0">
                              <Clock size={8} className="mr-0.5" />{h.eta}
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Card.Content>
              </Card>
            </ScrollReveal>

            {/* Card 5 — Agent Network */}
            <ScrollReveal delay={0.1}>
              <Card className="!inline-block w-full h-full">
                <Card.Header>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                      <Radio size={16} className="text-orange-500" />
                    </div>
                    <Card.Title>Agent Network</Card.Title>
                  </div>
                  <Card.Description>Autonomous AI agents coordinating in real-time</Card.Description>
                </Card.Header>
                <Card.Content>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Triage AI", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" },
                      { label: "Dispatch", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" },
                      { label: "Hospital Match", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30" },
                      { label: "Route Optimizer", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30" },
                      { label: "Vitals Monitor", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30" },
                      { label: "Comms Bridge", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" },
                    ].map((agent, i) => (
                      <motion.span
                        key={agent.label}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border ${agent.color}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8 + i * 0.08 }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {agent.label}
                      </motion.span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Zap size={12} className="text-green-500" />
                    <span>6 agents active · 12ms latency</span>
                  </div>
                </Card.Content>
              </Card>
            </ScrollReveal>

            {/* Card 6 — Real-time Vitals (full width) */}
            <ScrollReveal delay={0.15} className="sm:col-span-2 lg:col-span-3">
              <Card className="!inline-block w-full">
                <Card.Header>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                      <Stethoscope size={16} className="text-red-500" />
                    </div>
                    <Card.Title>Real-time Vitals Monitoring</Card.Title>
                  </div>
                  <Card.Description>Continuous patient data streaming with AI anomaly detection</Card.Description>
                </Card.Header>
                <Card.Content>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Heart Rate", value: "72", unit: "bpm", color: "#EF4444", sparkline: "M0,15 L5,14 L10,16 L15,12 L17,20 L18,5 L19,25 L20,10 L25,15 L30,14" },
                      { label: "Blood Pressure", value: "120/80", unit: "mmHg", color: "#3B82F6", sparkline: "M0,15 L5,13 L10,14 L15,12 L20,14 L25,13 L30,15" },
                      { label: "SpO₂", value: "98", unit: "%", color: "#22C55E", sparkline: "M0,8 L5,7 L10,8 L15,7 L20,8 L25,7 L30,8" },
                      { label: "Resp Rate", value: "16", unit: "/min", color: "#F97316", sparkline: "M0,15 L5,10 L10,18 L15,10 L20,18 L25,10 L30,15" },
                    ].map((vital, i) => (
                      <motion.div
                        key={vital.label}
                        className="bg-muted/50 rounded-lg p-3 border"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8 + i * 0.1 }}
                      >
                        <div className="text-[10px] text-muted-foreground mb-1">{vital.label}</div>
                        <div className="flex items-baseline gap-1">
                          <span className="font-head text-xl" style={{ color: vital.color }}>{vital.value}</span>
                          <span className="text-[10px] text-muted-foreground">{vital.unit}</span>
                        </div>
                        <svg viewBox="0 0 30 25" className="w-full h-6 mt-1">
                          <path d={vital.sparkline} fill="none" stroke={vital.color} strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </motion.div>
                    ))}
                  </div>
                </Card.Content>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="relative py-20 sm:py-28 px-4 gradient-warm-subtle">
        <div className="relative z-10 max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <Badge variant="solid" size="md" className="mb-4 inline-flex items-center gap-1.5">
                <BarChart3 size={12} />
                How It Works
              </Badge>
              <Text as="h2" className="mb-3">
                Three Steps to Saving Lives
              </Text>
              <Text as="p" className="text-muted-foreground max-w-xl mx-auto">
                From emergency detection to definitive care — powered by AI at every step.
              </Text>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                step: 1,
                title: "Emergency Detected",
                desc: "AI monitors vitals and environmental signals, instantly detecting emergencies and initiating triage protocols.",
                icon: Shield,
                color: "text-red-500 bg-red-500/10 border-red-500/30",
                screen: <PhoneScreenEmergency />,
              },
              {
                step: 2,
                title: "AI Coordinates",
                desc: "Autonomous agents dispatch EMS, match hospitals by capability and capacity, optimize routes in real-time.",
                icon: Brain,
                color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
                screen: <PhoneScreenAgent />,
              },
              {
                step: 3,
                title: "Lives Saved",
                desc: "Patient arrives at the right hospital with full context. Doctors are briefed before the ambulance arrives.",
                icon: Heart,
                color: "text-green-500 bg-green-500/10 border-green-500/30",
                screen: <PhoneScreenDashboard />,
              },
            ].map((item, i) => (
              <ScrollReveal key={item.step} delay={i * 0.15}>
                <div className="flex flex-col items-center text-center">
                  {/* Step number */}
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center mb-4 ${item.color}`}>
                    <span className="font-head text-lg">{item.step}</span>
                  </div>

                  <Text as="h3" className="mb-2">{item.title}</Text>
                  <Text as="p" className="text-muted-foreground text-sm mb-8 max-w-xs">
                    {item.desc}
                  </Text>

                  {/* Phone mockup */}
                  <PhoneMockup delay={0.3 + i * 0.15} scale={0.85}>
                    {item.screen}
                  </PhoneMockup>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AGENT TYPES SECTION ─── */}
      <section className="relative py-20 sm:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-14">
              <Badge variant="solid" size="md" className="mb-4 inline-flex items-center gap-1.5">
                <Users size={12} />
                AI Agents
              </Badge>
              <Text as="h2" className="mb-3">
                Meet the Agent Network
              </Text>
              <Text as="p" className="text-muted-foreground max-w-xl mx-auto">
                Six specialized AI agents working in concert — each an expert in its domain,
                all connected through MEDI DEV&apos;s orchestration layer.
              </Text>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Brain,
                title: "Triage Agent",
                desc: "Analyzes symptoms, vitals, and patient history to determine severity and priority in under 2 seconds.",
                color: "text-red-500",
                bgColor: "bg-red-500/10 border-red-500/30",
                stat: "< 2s",
                statLabel: "triage time",
              },
              {
                icon: Ambulance,
                title: "Dispatch Agent",
                desc: "Selects and dispatches the nearest, best-equipped EMS unit based on real-time location and capabilities.",
                color: "text-blue-500",
                bgColor: "bg-blue-500/10 border-blue-500/30",
                stat: "4 min",
                statLabel: "avg dispatch",
              },
              {
                icon: Hospital,
                title: "Hospital Match Agent",
                desc: "Cross-references hospital bed availability, specialty capabilities, and patient needs for optimal placement.",
                color: "text-green-500",
                bgColor: "bg-green-500/10 border-green-500/30",
                stat: "150+",
                statLabel: "hospitals",
              },
              {
                icon: MapPin,
                title: "Route Optimizer",
                desc: "Calculates fastest routes accounting for traffic, road conditions, and real-time obstacles.",
                color: "text-purple-500",
                bgColor: "bg-purple-500/10 border-purple-500/30",
                stat: "30%",
                statLabel: "faster routes",
              },
              {
                icon: Activity,
                title: "Vitals Monitor",
                desc: "Continuously streams and analyzes patient vitals during transport, alerting on anomalies instantly.",
                color: "text-orange-500",
                bgColor: "bg-orange-500/10 border-orange-500/30",
                stat: "24/7",
                statLabel: "monitoring",
              },
              {
                icon: Radio,
                title: "Comms Bridge",
                desc: "Maintains real-time communication between all parties — EMS, hospitals, dispatch, and family.",
                color: "text-cyan-500",
                bgColor: "bg-cyan-500/10 border-cyan-500/30",
                stat: "12ms",
                statLabel: "latency",
              },
            ].map((agent, i) => {
              const Icon = agent.icon;
              return (
                <ScrollReveal key={agent.title} delay={i * 0.08}>
                  <Card className="!inline-block w-full h-full group hover:border-primary/50 transition-colors">
                    <Card.Content className="!p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${agent.bgColor}`}>
                          <Icon size={20} className={agent.color} />
                        </div>
                        <div className="text-right">
                          <span className="font-head text-lg text-primary block">{agent.stat}</span>
                          <span className="text-[10px] text-muted-foreground">{agent.statLabel}</span>
                        </div>
                      </div>
                      <Text as="h4" className="mb-1.5 group-hover:text-primary transition-colors">{agent.title}</Text>
                      <Text as="p" className="text-muted-foreground text-sm leading-relaxed">{agent.desc}</Text>
                    </Card.Content>
                  </Card>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA FOOTER ─── */}
      <section className="relative py-20 sm:py-28 px-4 gradient-warm overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-20 h-20 border-2 border-white/20 rounded-full" />
        <div className="absolute bottom-10 right-10 w-32 h-32 border-2 border-white/10 rounded-full" />
        <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-white/30 rounded-full pulse-dot" />
        <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-white/20 rounded-full pulse-dot" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <Text as="h2" className="!text-white !text-4xl sm:!text-5xl lg:!text-6xl mb-4">
              Ready to Transform Emergency Response?
            </Text>
          </ScrollReveal>
          <ScrollReveal delay={0.15}>
            <Text as="p" className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Join the network of hospitals and first responders using MEDI DEV
              to save lives in the Golden Hour.
            </Text>
          </ScrollReveal>
          <ScrollReveal delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Get Early Access
                <ArrowRight size={18} className="ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto !text-white !border-white/50 hover:!bg-white/10">
                Schedule Demo
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t-2 border-border bg-background py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary pulse-dot" />
            <Text as="h5" className="!text-sm">MEDI DEV</Text>
            <span className="text-muted-foreground text-sm">· Golden Hour</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>All Rights Reserved by Medi Dev</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">Saving lives with AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
