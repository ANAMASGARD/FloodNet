'use client';
import React from 'react';
import { Shield, MapPin, Ship, AlertTriangle, Package, Route, Heart, Cloud, Newspaper, Network, Search, CreditCard, Upload } from 'lucide-react';
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

      {/* Zynd Network (Publish / Search / Pay proof for judges) */}
      {plan.zynd_network && (
        <div className="border-2 rounded-2xl p-5 bg-linear-to-br from-violet-500/5 to-blue-500/5 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Network className="w-5 h-5 text-violet-500" />
            <h3 className="font-head text-lg">Zynd Decentralized Agent Network</h3>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 p-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
              <Upload className="w-4 h-4 text-violet-500 shrink-0" />
              <div>
                <p className="text-xs font-head text-violet-700 dark:text-violet-300">Publish</p>
                <p className="text-[10px] text-muted-foreground">{plan.zynd_network.zynd_services_used?.publish}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Search className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-xs font-head text-blue-700 dark:text-blue-300">Search</p>
                <p className="text-[10px] text-muted-foreground">{plan.zynd_network.zynd_services_used?.search}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-green-500/10 rounded-xl border border-green-500/20">
              <CreditCard className="w-4 h-4 text-green-500 shrink-0" />
              <div>
                <p className="text-xs font-head text-green-700 dark:text-green-300">Pay (x402)</p>
                <p className="text-[10px] text-muted-foreground">{plan.zynd_network.zynd_services_used?.pay}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-muted/50 rounded-lg border">
              <p className="text-lg font-head">{plan.zynd_network.agents_discovered_via_zynd}</p>
              <p className="text-[9px] text-muted-foreground">Agents Discovered</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg border">
              <p className="text-lg font-head">{plan.zynd_network.agents_called?.length || 0}</p>
              <p className="text-[9px] text-muted-foreground">Agents Called</p>
            </div>
          </div>

          {plan.zynd_network.agents_called?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {plan.zynd_network.agents_called.map((name, i) => (
                <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-head border border-violet-500/20">
                  {name.replace('call_', '')}
                </span>
              ))}
            </div>
          )}

          <p className="text-[9px] text-muted-foreground mt-3 text-center">
            Mode: <span className="font-head">{plan.zynd_network.mode}</span>
            {plan.zynd_network.paid_agent_used && ' · x402 payment processed'}
          </p>
        </div>
      )}

      {/* Disclaimer */}
      {plan.disclaimer && (
        <p className="text-[10px] text-muted-foreground text-center px-4">{plan.disclaimer}</p>
      )}
    </div>
  );
}
