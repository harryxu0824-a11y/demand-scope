import { AnalyzeFlow } from "@/components/AnalyzeFlow";
import { TokenGate } from "@/components/TokenGate";

export default function AnalyzePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Demand Scope</h1>
        <p className="mt-1 text-sm text-muted">
          Reddit-based demand diagnostic. Honest about platform limits.
        </p>
      </header>
      <TokenGate>
        <AnalyzeFlow />
      </TokenGate>
    </main>
  );
}
