import { Badge } from "@/components/ui/badge";

import type { Signal } from "../domain/signal";

export function SignalsHistory({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) {
    return (
      <div className="border-b py-10 text-center">
        <p className="font-medium">Nenhum Sinal registrado.</p>
        <p className="pt-2 text-sm text-muted-foreground">
          Sinais aparecem aqui quando as médias móveis salvas atendem às regras
          técnicas configuradas.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-left text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th className="border-b px-3 py-3 font-medium">Ativo</th>
            <th className="border-b px-3 py-3 font-medium">Tipo</th>
            <th className="border-b px-3 py-3 font-medium">Pregão</th>
            <th className="border-b px-3 py-3 font-medium">Motivo técnico</th>
            <th className="border-b px-3 py-3 font-medium">Registrado em</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((signal) => (
            <tr key={signal.id}>
              <td className="border-b px-3 py-3 font-medium">
                {signal.symbol}
              </td>
              <td className="border-b px-3 py-3">
                <Badge variant="secondary">{formatSignalType(signal)}</Badge>
              </td>
              <td className="border-b px-3 py-3">
                {formatMarketDate(signal.marketDate)}
              </td>
              <td className="border-b px-3 py-3">
                {formatSignalReason(signal)}
              </td>
              <td className="border-b px-3 py-3">
                {formatDateTime(signal.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatSignalType(signal: Signal) {
  return signal.signalType === "BUY" ? "Compra técnica" : signal.signalType;
}

function formatSignalReason(signal: Signal) {
  switch (signal.reason) {
    case "EMA6_CROSSED_ABOVE_EMA42":
      return "MME6 cruzou acima da MME42.";
    case "EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42":
      return "MME6 cruzou acima da MME13 enquanto estava acima da MME42.";
  }
}

function formatMarketDate(marketDate: string) {
  const [year, month, day] = marketDate.split("-");

  return `${day}/${month}/${year}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
