"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { Textarea } from "./ui/Textarea";

interface Props {
  onSubmit: (description: string) => void;
  loading: boolean;
  initialValue?: string;
}

const MIN = 30;

export function DescriptionInput({
  onSubmit,
  loading,
  initialValue = "",
}: Props) {
  const [value, setValue] = useState(initialValue);
  const chars = value.trim().length;
  const canSubmit = chars >= MIN && !loading;

  const submit = () => {
    if (canSubmit) onSubmit(value.trim());
  };

  return (
    <Card>
      <CardTitle>Describe your business</CardTitle>
      <CardDescription>
        Paste it in your own words — marketing language is fine, the reframer will translate.
      </CardDescription>
      <div className="mt-4 space-y-3">
        <Textarea
          value={value}
          onChange={setValue}
          autoGrow
          rows={4}
          placeholder="e.g. An AI tool that helps patients remember what their doctors said after appointments…"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {chars < MIN
              ? `${MIN - chars} more characters · press Enter to submit`
              : `${chars} characters · press Enter to submit (Shift+Enter = new line)`}
          </span>
          <Button onClick={submit} disabled={!canSubmit}>
            {loading ? "Analyzing…" : "Analyze"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
