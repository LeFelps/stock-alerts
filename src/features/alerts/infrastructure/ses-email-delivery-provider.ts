import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

import type { EmailDeliveryProvider } from "../application/ports";
import type { BuySignalAlertEmail } from "../domain/email-delivery";

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
    async sendBuySignalAlert(email) {
      const result = await client.send(
        new SendEmailCommand({
          Destination: {
            ToAddresses: [email.recipientEmail],
          },
          Message: {
            Body: {
              Text: {
                Charset: "UTF-8",
                Data: buildTextBody(email),
              },
            },
            Subject: {
              Charset: "UTF-8",
              Data: `Sinal técnico de compra: ${email.signal.symbol}`,
            },
          },
          Source: fromEmail,
        }),
      );

      return { providerMessageId: result.MessageId };
    },
  };
}

function buildTextBody({ signal }: BuySignalAlertEmail) {
  return [
    `Um sinal técnico de compra foi registrado para ${signal.symbol}.`,
    "",
    `Ativo: ${signal.symbol}`,
    `Data: ${formatMarketDate(signal.marketDate)}`,
    `Motivo técnico: ${formatSignalReason(signal.reason)}`,
    "",
    "Este alerta é gerado mecanicamente por regras técnicas configuradas no app e não constitui recomendação de investimento.",
  ].join("\n");
}

function formatMarketDate(marketDate: string) {
  const [year, month, day] = marketDate.split("-");

  return `${day}/${month}/${year}`;
}

function formatSignalReason(reason: BuySignalAlertEmail["signal"]["reason"]) {
  switch (reason) {
    case "EMA6_CROSSED_ABOVE_EMA42":
      return "MME6 cruzou acima da MME42.";
    case "EMA6_CROSSED_ABOVE_EMA13_WHILE_ABOVE_EMA42":
      return "MME6 cruzou acima da MME13 enquanto estava acima da MME42.";
  }
}
