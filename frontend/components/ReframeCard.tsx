"use client";

import { useState } from "react";
import type { Reframe } from "@/lib/types";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { Textarea } from "./ui/Textarea";

interface Props {
  initial: Reframe;
  onConfirm: (edited: Reframe) => void;
  onBack: () => void;
  confirmLabel?: string;
  nextLoading?: boolean;
}

export function ReframeCard({
  initial,
  onConfirm,
  onBack,
  confirmLabel = "Looks right, continue →",
  nextLoading = false,
}: Props) {
  const [jtbd, setJtbd] = useState(initial.job_to_be_done);
  const [rephrase, setRephrase] = useState(initial.user_language_rephrase);
  const [pains, setPains] = useState<string[]>(initial.pain_hypotheses);

  function updatePain(i: number, v: string) {
    setPains((p) => p.map((x, idx) => (idx === i ? v : x)));
  }
  function removePain(i: number) {
    setPains((p) => p.filter((_, idx) => idx !== i));
  }
  function addPain() {
    setPains((p) => [...p, ""]);
  }

  const cleaned = pains.map((s) => s.trim()).filter(Boolean);
  const canContinue = Boolean(jtbd.trim() && rephrase.trim() && cleaned.length > 0);

  const submit = () => {
    if (!canContinue || nextLoading) return;
    onConfirm({
      job_to_be_done: jtbd.trim(),
      user_language_rephrase: rephrase.trim(),
      pain_hypotheses: cleaned,
    });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <Card>
      <CardTitle>Understanding your business</CardTitle>
      <CardDescription>
        The reframer strips marketing language. Edit anything that feels off — this is what the
        rest of the pipeline uses to search Reddit.
      </CardDescription>
      <p className="mt-2 text-xs text-muted">
        Press{" "}
        <kbd className="rounded border border-border bg-bg px-1 font-mono text-[10px]">
          Enter
        </kbd>{" "}
        to continue ·{" "}
        <kbd className="rounded border border-border bg-bg px-1 font-mono text-[10px]">
          Shift
        </kbd>
        +
        <kbd className="rounded border border-border bg-bg px-1 font-mono text-[10px]">
          Enter
        </kbd>{" "}
        to add a new line
      </p>

      <div className="mt-5 space-y-5">
        <Field label="Job to be done" hint="The concrete task a user hires this product for.">
          <Textarea
            value={jtbd}
            onChange={setJtbd}
            autoGrow
            rows={1}
            onKeyDown={handleKey}
          />
        </Field>

        <Field
          label="User-language rephrase"
          hint="How an actual user would describe the problem (not the product)."
        >
          <Textarea
            value={rephrase}
            onChange={setRephrase}
            autoGrow
            rows={3}
            onKeyDown={handleKey}
          />
        </Field>

        <Field
          label="Pain hypotheses"
          hint="Plausible underlying pains. These seed Reddit search terms."
        >
          <div className="space-y-2">
            {pains.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Textarea
                  value={p}
                  onChange={(v) => updatePain(i, v)}
                  autoGrow
                  rows={1}
                  className="flex-1"
                  onKeyDown={handleKey}
                />
                <button
                  type="button"
                  onClick={() => removePain(i)}
                  className="text-xs text-muted hover:text-err"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addPain}
              className="text-xs text-muted hover:text-fg"
            >
              + add hypothesis
            </button>
          </div>
        </Field>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled={nextLoading}>
          ← edit description
        </Button>
        <Button onClick={submit} disabled={!canContinue || nextLoading}>
          {nextLoading ? "Continuing…" : confirmLabel}
        </Button>
      </div>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <label className="text-sm font-medium text-fg">{label}</label>
        <span className="text-xs text-muted">{hint}</span>
      </div>
      {children}
    </div>
  );
}
