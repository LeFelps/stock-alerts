import { Bell, LineChart, LockKeyhole, Menu, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Visão geral", icon: LineChart, current: true },
  { label: "Regras de alerta", icon: Bell, current: false },
  { label: "Conta", icon: LockKeyhole, current: false },
];

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
    title: "Conectar autenticação",
    description: "Preparar a entrada segura nas próximas etapas do MVP.",
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

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <DashboardHeader />

        <div className="grid flex-1 gap-8 py-8 lg:grid-cols-[14rem_1fr]">
          <DesktopSidebarNav />

          <section className="grid content-start gap-10">
            <section className="rounded-lg bg-muted/55 p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeader
                  title="Painel protegido"
                  description="Espaço reservado para a experiência autenticada de alertas de ativos."
                />
                <Badge variant="secondary" className="w-fit">
                  Autenticação pendente
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
          </section>
        </div>
      </div>
    </main>
  );
}

function DashboardHeader() {
  return (
    <header className="flex min-h-12 items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <LineChart aria-hidden="true" className="size-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Alertas de Ativos
          </p>
          <h1 className="text-xl font-semibold">Painel</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button className="hidden sm:inline-flex" variant="outline" size="sm">
          <Settings aria-hidden="true" className="size-4" />
          Configurações
        </Button>
        <MobileNavDrawer />
      </div>
    </header>
  );
}

function DesktopSidebarNav() {
  return (
    <aside className="hidden lg:block">
      <DashboardNav ariaLabel="Seções do painel" />
    </aside>
  );
}

function MobileNavDrawer() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          aria-label="Abrir navegação"
          className="lg:hidden"
          size="icon"
          variant="outline"
        >
          <Menu aria-hidden="true" className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Alertas de Ativos</SheetTitle>
        </SheetHeader>
        <DashboardNav ariaLabel="Navegação principal" className="pt-6" />
      </SheetContent>
    </Sheet>
  );
}

function DashboardNav({
  ariaLabel,
  className,
}: {
  ariaLabel: string;
  className?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className={cn("grid gap-1.5", className)}>
      {navItems.map((item) => {
        const Icon = item.icon;

        return (
          <Button
            className={cn(
              "justify-start px-3 text-muted-foreground",
              item.current &&
                "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
            )}
            key={item.label}
            variant="ghost"
          >
            <Icon aria-hidden="true" className="size-4" />
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
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
