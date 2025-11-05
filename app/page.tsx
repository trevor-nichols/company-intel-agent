import { CompanyIntelPanel, CompanyIntelProviders } from '@/components/company-intel';

export default function HomePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/60 py-8 backdrop-blur">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-3 px-6 text-left">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Company Intel Starter</h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Run an end-to-end company intelligence collection with streaming progress, editable profile data, and snapshot exports.
          </p>
        </div>
      </header>
      <CompanyIntelProviders teamId={1}>
        <main className="mx-auto w-full max-w-screen-2xl py-12">
          <CompanyIntelPanel />
        </main>
      </CompanyIntelProviders>
    </div>
  );
}
