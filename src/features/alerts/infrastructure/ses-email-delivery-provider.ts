import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

import type { EmailDeliveryProvider } from "../application/ports";
import type { BuySignalDigestEmail } from "../domain/email-delivery";

type SesEmailDeliveryProviderConfig = {
  fromEmail: string;
  region: string;
};

export function createSesEmailDeliveryProvider({
  fromEmail,
  region,
}: SesEmailDeliveryProviderConfig): EmailDeliveryProvider {
  const client = new SESClient({ region });

  return {
    name: "ses",
    async sendBuySignalDigest(email) {
      const result = await client.send(
        new SendEmailCommand({
          Destination: {
            ToAddresses: [email.recipientEmail],
          },
          Message: {
            Body: {
              Text: {
                Charset: "UTF-8",
                Data: buildDigestTextBody(email),
              },
            },
            Subject: {
              Charset: "UTF-8",
              Data: buildDigestSubject(email.marketDate),
            },
          },
          Source: fromEmail,
        }),
      );

      return { providerMessageId: result.MessageId };
    },
  };
}

export function buildDigestSubject(marketDate: string) {
  return `[ALERTA] Sugestões de compra — ${formatMarketDate(marketDate)}`;
}

export function buildDigestTextBody({
  marketDate,
  signals,
}: BuySignalDigestEmail) {
  const signalsBySymbol = [...signals]
    .sort(
      (left, right) =>
        left.symbol.localeCompare(right.symbol) ||
        left.reason.localeCompare(right.reason),
    )
    .reduce<Map<string, BuySignalDigestEmail["signals"]>>((groups, signal) => {
      const symbolSignals = groups.get(signal.symbol) ?? [];
      symbolSignals.push(signal);
      groups.set(signal.symbol, symbolSignals);
      return groups;
    }, new Map());

  const entries = [...signalsBySymbol].flatMap(([symbol, symbolSignals]) => [
    `Ativo: ${symbol}`,
    ...symbolSignals.map(
      (signal) => `- Motivo técnico: ${formatSignalReason(signal.reason)}`,
    ),
    "",
  ]);

  return [
    `Sugestões de compra para ${formatMarketDate(marketDate)}:`,
    "",
    ...entries,
    "Este alerta é gerado mecanicamente por regras técnicas configuradas no app e não constitui recomendação de investimento.",
  ].join("\n");
}

function formatMarketDate(marketDate: string) {
  const [year, month, day] = marketDate.split("-");

  return `${day}/${month}/${year}`;
}

function formatSignalReason(
  reason: BuySignalDigestEmail["signals"][number]["reason"],
) {
  switch (reason) {
    case "EMA6_CROSSED_ABOVE_EMA42":
      return "MME6 cruzou acima da MME42.";
    case "EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42":
      return "MME6 cruzou acima da MME13 enquanto estava acima da MME42.";
  }
}
