'use client';
import React from 'react';
import { Shield, MapPin, Ship, AlertTriangle, Package, Route } from 'lucide-react';
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

      {/* Disclaimer */}
      {plan.disclaimer && (
        <p className="text-[10px] text-muted-foreground text-center px-4">{plan.disclaimer}</p>
      )}
    </div>
  );
}
