import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { emptyJobRunSummary, toJobRunId, type JobRun } from "../domain/job-run";
import { JobRunsHistory } from "./job-runs-history";

const retryCheckAlertsJobMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const writeTextMock = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}));

vi.mock("../server/retry-check-alerts-job.action", () => ({
  retryCheckAlertsJob: retryCheckAlertsJobMock,
}));

describe("JobRunsHistory", () => {
  beforeEach(() => {
    retryCheckAlertsJobMock.mockReset();
    retryCheckAlertsJobMock.mockResolvedValue({
      jobRunId: "job-run-3",
      status: "success",
    });
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
    writeTextMock.mockReset();
    writeTextMock.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: writeTextMock },
    });
  });

  it("copies a failed run's complete error", async () => {
    const error = "PETR3: Failed to fetch market data (status 400)";
    render(<JobRunsHistory jobRuns={[createJobRun({ error })]} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Copiar erro da execução" }),
    );

    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith(error));
    expect(toastSuccessMock).toHaveBeenCalledWith("Erro copiado.");
  });

  it("shows the complete error and explains ignored targets on hover", async () => {
    const error = "PETR3: Failed to fetch market data (status 400)";
    render(<JobRunsHistory jobRuns={[createJobRun({ error })]} />);

    fireEvent.pointerEnter(screen.getByLabelText("Ver erro completo"));
    expect(
      await screen.findByText(error, { selector: "p" }),
    ).toBeInTheDocument();

    fireEvent.pointerEnter(
      screen.getByRole("button", { name: "O que significa Ignorados?" }),
    );
    expect(
      await screen.findByText(
        /cuja data de mercado mais recente já havia sido processada/,
      ),
    ).toBeInTheDocument();
  });

  it("keeps retry available from the latest failed run while filtering rows", async () => {
    render(
      <JobRunsHistory
        jobRuns={[
          createJobRun({ status: "FAILED" }),
          createJobRun({ id: toJobRunId("job-run-2"), status: "SUCCESS" }),
        ]}
      />,
    );
    const retryButton = screen.getByRole("button", {
      name: "Tentar novamente",
    });

    expect(retryButton).toHaveClass("h-9", "sm:ml-auto");

    fireEvent.change(
      screen.getByRole("textbox", { name: "Buscar na tabela" }),
      { target: { value: "Sucesso" } },
    );

    expect(retryButton).toBeEnabled();
    expect(screen.queryByText("Falha")).not.toBeInTheDocument();
    fireEvent.click(retryButton);

    await waitFor(() => expect(retryCheckAlertsJobMock).toHaveBeenCalled());
    expect(retryCheckAlertsJobMock.mock.calls[0]?.[0].get("intent")).toBe(
      "retry",
    );
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Execução concluída com sucesso.",
    );
  });

  it("disables retry when the latest run succeeded", () => {
    render(<JobRunsHistory jobRuns={[createJobRun({ status: "SUCCESS" })]} />);

    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeDisabled();
  });
});

function createJobRun(fields: Partial<JobRun> = {}): JobRun {
  return {
    createdAt: new Date("2026-07-14T11:00:00.000Z"),
    durationMs: 1000,
    eligibleMarketDate: "2026-07-13",
    error: "Provider unavailable",
    finishedAt: new Date("2026-07-14T11:00:01.000Z"),
    id: toJobRunId("job-run-1"),
    jobName: "CHECK_ALERTS",
    startedAt: new Date("2026-07-14T11:00:00.000Z"),
    status: "FAILED",
    summary: emptyJobRunSummary(),
    updatedAt: new Date("2026-07-14T11:00:01.000Z"),
    ...fields,
  };
}
