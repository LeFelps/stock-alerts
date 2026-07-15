import {
  Resend,
  type CreateEmailOptions,
  type CreateEmailResponse,
} from "resend";

import type { EmailDeliveryProvider } from "../application/ports";
import type { BuySignalDigestEmail } from "../domain/email-delivery";

type ResendEmailDeliveryProviderConfig = {
  apiKey: string;
  fromEmail: string;
};

export type ResendEmailClient = {
  send(email: CreateEmailOptions): Promise<CreateEmailResponse>;
};

export function createResendEmailDeliveryProvider(
  { apiKey, fromEmail }: ResendEmailDeliveryProviderConfig,
  client: ResendEmailClient = new Resend(apiKey).emails,
): EmailDeliveryProvider {
  return {
    name: "resend",
    async sendBuySignalDigest(email) {
      const { data, error } = await client.send({
        from: fromEmail,
        subject: buildDigestSubject(email.marketDate),
        text: buildDigestTextBody(email),
        to: [email.recipientEmail],
      });

      if (error) {
        throw new Error(formatResendError(error));
      }

      return { providerMessageId: data.id };
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

function formatResendError(error: {
  message: string;
  name: string;
  statusCode: number | null;
}) {
  const status = error.statusCode ? `, HTTP ${error.statusCode}` : "";

  return `Resend email delivery failed (${error.name}${status}): ${error.message}`;
}
