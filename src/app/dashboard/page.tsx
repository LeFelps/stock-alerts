import {
  DashboardShell,
  SectionHeader,
} from "@/app/dashboard/_components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { requireCurrentProfile } from "@/features/profiles/server/current-profile";

const watchlist = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    target: "$215.00",
    status: "Aguardando",
  },
  { symbol: "MSFT", name: "Microsoft", target: "$480.00", status: "Ativa" },
  { symbol: "NVDA", name: "NVIDIA", target: "$142.50", status: "Pausada" },
];

const setupTasks = [
  {
    title: "Conectar regras reais",
    description: "Ligar a lista de acompanhamento às regras salvas do usuário.",
  },
  {
    title: "Salvar regras de alerta",
    description: "Persistir condições configuradas para cada ativo monitorado.",
  },
  {
    title: "Integrar dados de mercado",
    description: "Conectar a fonte de preços usada para avaliar os alertas.",
  },
];

export default async function DashboardPage() {
  const currentProfile = await requireCurrentProfile();

  return (
    <DashboardShell activeSection="overview" userEmail={currentProfile.email}>
      <section className="rounded-lg bg-muted/55 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            title="Painel protegido"
            description="Espaço autenticado para acompanhar ativos e preparar regras de alerta."
          />
          <Badge variant="secondary" className="w-fit">
            Sessão ativa
          </Badge>
        </div>

        <SetupChecklist />
      </section>

      <section className="grid gap-4">
        <SectionHeader
          title="Prévia da lista de acompanhamento"
          description="Dados estáticos para orientar o fluxo futuro de regras de alerta."
        />
        <WatchlistTable />
      </section>
    </DashboardShell>
  );
}

function SetupChecklist() {
  return (
    <ul className="grid gap-3 pt-6 md:grid-cols-3">
      {setupTasks.map((task) => (
        <li className="rounded-md bg-background p-4" key={task.title}>
          <p className="text-sm font-medium">{task.title}</p>
          <p className="pt-2 text-sm leading-6 text-muted-foreground">
            {task.description}
          </p>
        </li>
      ))}
    </ul>
  );
}

function WatchlistTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-left text-sm">
        <thead className="text-muted-foreground">
          <tr>
            <th className="border-b px-3 py-3 font-medium">Código</th>
            <th className="border-b px-3 py-3 font-medium">Empresa</th>
            <th className="border-b px-3 py-3 font-medium">Alvo</th>
            <th className="border-b px-3 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {watchlist.map((asset) => (
            <tr key={asset.symbol}>
              <td className="border-b px-3 py-4 font-medium">{asset.symbol}</td>
              <td className="border-b px-3 py-4 text-muted-foreground">
                {asset.name}
              </td>
              <td className="border-b px-3 py-4">{asset.target}</td>
              <td className="border-b px-3 py-4">
                <Badge variant="outline">{asset.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
