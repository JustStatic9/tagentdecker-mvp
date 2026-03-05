"use client";

import { AdventurePlan } from "@/lib/adventureEngine";
import { Card } from "./ui/Card";

interface ResultsDisplayProps {
  plan: AdventurePlan;
  onRegenerate?: () => void;
}

export function ResultsDisplay({ plan, onRegenerate }: ResultsDisplayProps) {
  const totalHours = Math.floor(plan.totalDuration / 60);
  const totalMinutes = plan.totalDuration % 60;

  return (
    <div className="space-y-8">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-white to-zinc-50">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Dein Abenteuer</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-zinc-600 mb-1">Dauer</p>
              <p className="text-xl font-bold">
                {totalHours}h {totalMinutes}m
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 mb-1">Stops</p>
              <p className="text-xl font-bold">{plan.stops.length}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-600 mb-1">Fahrtzeit</p>
              <p className="text-xl font-bold">{Math.round(plan.driveTimeEstimate)}m</p>
            </div>
          </div>
          <p className="text-sm text-zinc-600 pt-4 border-t border-zinc-200">
            {plan.routeLogicDescription}
          </p>
        </div>
      </Card>

      {/* Timeline */}
      {plan.stops.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Deine Stops</h3>
          <div className="relative space-y-4">
            {plan.stops.map((stop, idx) => (
              <div key={stop.id} className="flex gap-4">
                {/* Timeline Dot */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      idx === 0
                        ? "bg-green-600"
                        : idx === plan.stops.length - 1
                          ? "bg-red-600"
                          : "bg-blue-600"
                    }`}
                  >
                    {idx === 0 ? "S" : idx === plan.stops.length - 1 ? "E" : idx}
                  </div>
                  {idx < plan.stops.length - 1 && (
                    <div className="w-1 h-8 bg-zinc-300 mt-2" />
                  )}
                </div>

                {/* Stop Card */}
                <Card className="flex-1">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-base">{stop.name}</h4>
                        {stop.description_short && (
                          <p className="text-sm text-zinc-600 mt-1">
                            {stop.description_short}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-medium text-zinc-500 ml-2">
                        {stop.categoryType || stop.category}
                      </span>
                    </div>
                    {stop.durationMinutes && (
                      <p className="text-xs text-zinc-500">
                        ⏱️ {stop.durationMinutes} min
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reasoning */}
      {plan.reasoning && plan.reasoning.length > 0 && (
        <Card className="bg-zinc-50">
          <details className="cursor-pointer">
            <summary className="font-medium text-sm hover:text-zinc-700">
              📝 Wie wurde diese Route erstellt?
            </summary>
            <div className="mt-4 space-y-2 text-sm text-zinc-700">
              {plan.reasoning.map((reason, idx) => (
                <p key={idx}>• {reason}</p>
              ))}
            </div>
          </details>
        </Card>
      )}

      {/* Regenerate Button */}
      {onRegenerate && (
        <div className="flex justify-center">
          <button
            onClick={onRegenerate}
            className="px-8 py-3 border border-zinc-300 rounded-xl hover:bg-zinc-50 transition-colors font-medium"
          >
            🔄 Neue Route generieren
          </button>
        </div>
      )}
    </div>
  );
}
