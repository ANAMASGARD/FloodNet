'use client';
import React, { useState } from 'react';
import { Shield, MapPin, Ship, AlertTriangle, Package, Route, Heart, Cloud, Newspaper, Clock, CheckCircle2, Circle, ExternalLink, BookOpen } from 'lucide-react';
import type { FloodResponsePlan } from './types';

interface Props {
  plan: FloodResponsePlan;
}

const severityColor: Record<string, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  moderate: 'bg-yellow-400 text-black',
  low: 'bg-green-500 text-white',
};

const priorityColor: Record<string, string> = {
  critical: 'border-red-500/40 bg-red-500/10',
  high: 'border-orange-500/40 bg-orange-500/10',
  medium: 'border-yellow-500/40 bg-yellow-500/10',
};

const urgencyBadge: Record<string, string> = {
  immediate: 'bg-red-500 text-white',
  within_hours: 'bg-orange-400 text-white',
  within_day: 'bg-yellow-400 text-black',
};

export default function FloodResponsePanel({ plan }: Props) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (step: number) => {
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  const riskColor: Record<string, { bg: string; text: string; bar: string }> = {
    low:      { bg: 'bg-green-500/10', text: 'text-green-600', bar: 'bg-green-500' },
    moderate: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', bar: 'bg-yellow-500' },
    high:     { bg: 'bg-orange-500/10', text: 'text-orange-600', bar: 'bg-orange-500' },
    extreme:  { bg: 'bg-red-500/10', text: 'text-red-600', bar: 'bg-red-500' },
  };

  return (
    <div id="response-section" className="space-y-6 pb-8">
      {/* Header */}
      <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-head text-xl">Flood Response Plan</h2>
            <p className="text-sm text-muted-foreground">{plan.location}</p>
          </div>
          <span className={`px-3 py-1 rounded-lg text-xs font-head ${severityColor[plan.severity] || 'bg-gray-500 text-white'}`}>
            {plan.severity?.toUpperCase()}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{plan.summary}</p>
      </div>

      {/* Immediate Actions */}
      {plan.immediate_actions?.length > 0 && (
        <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-head text-lg">Immediate Actions</h3>
          </div>
          <div className="space-y-3">
            {plan.immediate_actions.map((action, i) => (
              <div key={i} className={`flex gap-3 p-3 rounded-xl border-2 ${priorityColor[action.priority] || ''}`}>
                <div className="w-8 h-8 rounded-full bg-primary/10 border-2 flex items-center justify-center text-xs font-head text-primary shrink-0">
                  {action.step}
                </div>
                <div>
                  <h4 className="font-head text-sm">{action.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Risk Timeline ─────────────────────────────────── */}
      {plan.risk_timeline && plan.risk_timeline.length > 0 && (
        <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-500" />
            <h3 className="font-head text-lg">Risk Timeline</h3>
          </div>
          <div className="flex items-end gap-1 h-20 mb-3">
            {plan.risk_timeline.map((t, i) => {
              const rc = riskColor[t.risk_level] || riskColor.low;
              const heightPct = t.risk_level === 'extreme' ? 100 : t.risk_level === 'high' ? 75 : t.risk_level === 'moderate' ? 50 : 25;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-16">
                    <div
                      className={`w-full rounded-t-lg ${rc.bar} transition-all duration-500`}
                      style={{ height: `${heightPct}%`, minHeight: '8px' }}
                    />
                  </div>
                  <span className={`text-[9px] font-head ${rc.text}`}>{t.risk_level}</span>
                  <span className="text-[9px] text-muted-foreground">+{t.hours_from_now}h</span>
                </div>
              );
            })}
          </div>
          <div className="space-y-1.5">
            {plan.risk_timeline.map((t, i) => {
              const rc = riskColor[t.risk_level] || riskColor.low;
              return (
                <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg ${rc.bg}`}>
                  <span className={`text-[10px] font-head ${rc.text} shrink-0 mt-0.5`}>+{t.hours_from_now}h</span>
                  <p className="text-[10px] text-muted-foreground">{t.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Survival Playbook ─────────────────────────────── */}
      {plan.micro_playbook && plan.micro_playbook.length > 0 && (
        <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            <h3 className="font-head text-lg">Your Survival Playbook</h3>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4">Personalized for your household. Check off as you complete each step.</p>
          <div className="space-y-2">
            {plan.micro_playbook.map((step) => {
              const done = checkedSteps.has(step.step_number);
              const timeColor =
                step.timeframe === 'now' ? 'bg-red-500 text-white' :
                step.timeframe === 'within_1h' ? 'bg-orange-400 text-white' :
                step.timeframe === 'within_6h' ? 'bg-yellow-400 text-black' :
                'bg-blue-400 text-white';
              return (
                <button
                  key={step.step_number}
                  onClick={() => toggleStep(step.step_number)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    done ? 'bg-green-500/5 border-green-500/30 opacity-70' : 'bg-muted/50 border-border hover:border-primary/30'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-head text-sm ${done ? 'line-through' : ''}`}>{step.action}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-head shrink-0 ${timeColor}`}>
                        {step.timeframe.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{step.reason}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {plan.micro_playbook.length > 0 && (
            <div className="mt-3 flex items-center justify-between px-1">
              <span className="text-[10px] text-muted-foreground font-head">
                {checkedSteps.size}/{plan.micro_playbook.length} completed
              </span>
              <div className="flex-1 mx-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-300"
                  style={{ width: `${(checkedSteps.size / plan.micro_playbook.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Safe Zones */}
      {plan.safe_zones?.length > 0 && (
        <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-green-500" />
            <h3 className="font-head text-lg">Safe Zones</h3>
          </div>
          <div className="space-y-2">
            {plan.safe_zones.map((zone, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border-2">
                <div className="w-8 h-8 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center text-xs font-head text-green-600 shrink-0">
                  S{i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-head text-sm">{zone.name}</span>
                    <span className="text-[10px] text-muted-foreground">{zone.eta_minutes} min ETA</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${Math.min(100, (zone.current_occupancy / zone.capacity) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{zone.current_occupancy}/{zone.capacity}</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${zone.geo_coordinates.latitude},${zone.geo_coordinates.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-1.5 text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-head"
                  >
                    🧭 Get directions
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rescue Teams */}
      {plan.rescue_teams?.length > 0 && (
        <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Ship className="w-5 h-5 text-blue-500" />
            <h3 className="font-head text-lg">Rescue Teams</h3>
          </div>
          <div className="space-y-2">
            {plan.rescue_teams.map((team, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center shrink-0">
                  <Ship className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-head text-sm">{team.team_name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-head ${
                      team.status === 'deployed' ? 'bg-green-500/10 text-green-600' :
                      team.status === 'en_route' ? 'bg-blue-500/10 text-blue-600' :
                      'bg-gray-500/10 text-gray-600'
                    }`}>
                      {team.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Equipment: {team.equipment?.join(', ')} · ETA: {team.eta_minutes} min
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evacuation Routes */}
      {plan.evacuation_routes?.length > 0 && (
        <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Route className="w-5 h-5 text-purple-500" />
            <h3 className="font-head text-lg">Evacuation Routes</h3>
          </div>
          <div className="space-y-2">
            {plan.evacuation_routes.map((route, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border-2">
                <MapPin className="w-4 h-4 text-purple-500 shrink-0" />
                <div className="flex-1">
                  <span className="font-head text-sm">{route.route_name}</span>
                  <p className="text-[10px] text-muted-foreground">
                    {route.distance_km} km · ~{route.estimated_time_minutes} min · Status:{' '}
                    <span className={route.status === 'clear' ? 'text-green-600' : route.status === 'partial' ? 'text-orange-600' : 'text-red-600'}>
                      {route.status}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hospitals */}
      {plan.hospitals && plan.hospitals.length > 0 && (
        <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-red-500" />
            <h3 className="font-head text-lg">Nearby Hospitals</h3>
          </div>
          <div className="space-y-2">
            {plan.hospitals.map((h, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border-2">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  h.at_risk ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'
                }`}>
                  <Heart className={`w-3.5 h-3.5 ${h.at_risk ? 'text-red-500' : 'text-green-500'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-head text-sm">{h.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-head ${
                      h.open_now ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                    }`}>
                      {h.open_now ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {h.distance_km} km away · {h.address}
                    {h.at_risk && ' · ⚠️ In flood zone'}
                  </p>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${h.geo_coordinates.latitude},${h.geo_coordinates.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-block mt-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-head"
                  >
                    🧭 Get directions
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weather Current */}
      {plan.weather_current && (
        <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Cloud className="w-5 h-5 text-blue-400" />
            <h3 className="font-head text-lg">Current Weather</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Temperature', value: `${plan.weather_current.temp_c}°C` },
              { label: 'Rainfall', value: `${plan.weather_current.rainfall_mm} mm/h` },
              { label: 'Humidity', value: `${plan.weather_current.humidity_pct}%` },
              { label: 'Wind Speed', value: `${plan.weather_current.wind_speed_kmh} km/h` },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-xl border-2 text-center">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="font-head text-sm mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 capitalize text-center">{plan.weather_current.description}</p>
        </div>
      )}

      {/* Real-time Intel (Perplexity) */}
      {plan.perplexity_context && (
        <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="w-5 h-5 text-indigo-500" />
            <h3 className="font-head text-lg">Real-Time Intelligence</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{plan.perplexity_context}</p>
        </div>
      )}

      {/* Resource Needs */}
      {plan.resource_needs?.length > 0 && (
        <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-orange-500" />
            <h3 className="font-head text-lg">Resource Requirements</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {plan.resource_needs.map((need, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-xl border-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-head text-xs">{need.item}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-head ${urgencyBadge[need.urgency] || ''}`}>
                    {need.urgency?.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{need.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source Citations */}
      {plan.source_citations && plan.source_citations.length > 0 && (
        <div className="border-2 rounded-2xl p-5 bg-card shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <ExternalLink className="w-5 h-5 text-indigo-500" />
            <h3 className="font-head text-lg">Sources</h3>
          </div>
          <div className="space-y-2">
            {plan.source_citations.map((cite, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-muted/50 rounded-xl border-2">
                <span className="text-[10px] font-head text-indigo-500 shrink-0 mt-0.5">[{i + 1}]</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs">{cite.claim}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {cite.source.startsWith('http') ? (
                      <a href={cite.source} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {cite.source}
                      </a>
                    ) : (
                      <span className="italic">{cite.source}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Obstacle Warnings */}
      {plan.obstacles && plan.obstacles.length > 0 && (
        <div className="border-2 rounded-2xl p-5 bg-card shadow-md border-orange-500/30">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="font-head text-lg">Road &amp; Infrastructure Hazards</h3>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 font-head">
              {plan.obstacles.length} hazard{plan.obstacles.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {plan.obstacles.map((obs, i) => {
              const obstacleIcons: Record<string, string> = {
                road_closed: '🚧', bridge_out: '🌉', debris: '🪵',
                power_line: '⚡', landslide: '🏔️', submerged_road: '🌊',
              };
              const icon = obstacleIcons[obs.type] || '⚠️';
              const sevBg = obs.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                            obs.severity === 'high' ? 'bg-orange-500/10 border-orange-500/30' :
                            'bg-yellow-500/10 border-yellow-500/30';
              const sevText = obs.severity === 'critical' ? 'bg-red-500 text-white' :
                              obs.severity === 'high' ? 'bg-orange-500 text-white' :
                              'bg-yellow-400 text-black';
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border-2 ${sevBg}`}>
                  <span className="text-lg shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-head text-xs">{obs.type.replace(/_/g, ' ').toUpperCase()}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-head ${sevText}`}>
                        {obs.severity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{obs.description}</p>
                    {obs.affects_route && (
                      <p className="text-[10px] text-orange-600 mt-1 font-head">
                        ⚠ Affects: {obs.affects_route}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      {plan.disclaimer && (
        <p className="text-[10px] text-muted-foreground text-center px-4">{plan.disclaimer}</p>
      )}
    </div>
  );
}
