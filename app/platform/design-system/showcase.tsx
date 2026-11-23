"use client";

// The design system's base components, live from @01scale/ui-core, in their states (MVP1-E0-52
// AC1). A theme switch sets data-theme on this block only, so a visitor can see both themes
// whatever their own system uses. Nothing opens by itself: the dialog and the toast wait for a
// click (AC4).

import { useState, type ReactNode } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  Input,
  ProgressBar,
  Select,
  Skeleton,
  Spinner,
  Tabs,
  ToastProvider,
  useToast,
  type Tone,
  type ToastTone,
} from "@01scale/ui-core";

type Theme = "system" | "light" | "dark";

const THEMES: { id: Theme; label: string }[] = [
  { id: "system", label: "My system" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

const TONES: Tone[] = [
  "neutral",
  "brand",
  "info",
  "success",
  "warning",
  "danger",
];
const ALERT_TONES = ["info", "success", "warning", "danger"] as const;
const ALERT_TEXT: Record<(typeof ALERT_TONES)[number], string> = {
  info: "Extraction usually takes under a minute.",
  success: "Payment received. Your results are ready.",
  warning: "Two fields need a check before you continue.",
  danger: "Upload failed. Nothing was saved; try again.",
};

function Item({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="ds-item" aria-labelledby={`ds-${name}`}>
      <h3 id={`ds-${name}`} className="ds-item-title">
        <code>{name}</code>
      </h3>
      <div className="ds-item-body">{children}</div>
    </section>
  );
}

function ToastButtons() {
  const toast = useToast();
  const shows: { tone: ToastTone; label: string; message: string }[] = [
    {
      tone: "success",
      label: "Show a success toast",
      message: "Saved. Your changes are kept.",
    },
    {
      tone: "danger",
      label: "Show a failure toast",
      message: "Could not save. Try again.",
    },
  ];
  return (
    <div className="ds-row">
      {shows.map((s) => (
        <Button
          key={s.tone}
          variant="secondary"
          onClick={() => toast.show(s.message, s.tone)}
        >
          {s.label}
        </Button>
      ))}
    </div>
  );
}

function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open a dialog
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this file?"
        actions={
          <>
            <Button variant="danger" onClick={() => setOpen(false)}>
              Delete
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <p>
          A demonstration: nothing is deleted. Escape, the × or a click outside
          closes it, and focus returns to the button.
        </p>
      </Dialog>
    </>
  );
}

function TabsDemo() {
  const [tab, setTab] = useState("fields");
  return (
    <Tabs
      label="Example tabs"
      value={tab}
      onChange={setTab}
      items={[
        {
          id: "fields",
          label: "Fields",
          content: <p>Arrow keys move between tabs.</p>,
        },
        {
          id: "json",
          label: "JSON",
          content: <p>Each tab has its own panel.</p>,
        },
        {
          id: "csv",
          label: "CSV",
          content: <p>Only the chosen panel is shown.</p>,
        },
      ]}
    />
  );
}

export function DesignSystemShowcase({ version }: { version: string }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  return (
    <>
      <div className="ds-toolbar">
        <div
          className="ds-theme"
          role="group"
          aria-label="Theme for the components below"
        >
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="ds-theme-option"
              aria-pressed={theme === t.id}
              onClick={() => setTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="ui-hint">
          Live from <code>@01scale/ui-core</code> {version}
        </span>
      </div>

      {/* The toast region sits inside the themed block, so toasts take its theme too. */}
      <div
        className="ds-showcase ui-root"
        data-theme={theme === "system" ? undefined : theme}
      >
        <ToastProvider>
          <Item name="Button">
            <div className="ds-row">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className="ds-row">
              <Button size="sm">Small</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Saving</Button>
              <Button
                variant="secondary"
                loading={loading}
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => setLoading(false), 1500);
                }}
              >
                {loading ? "Working" : "Click to load"}
              </Button>
            </div>
          </Item>

          <Item name="Input">
            <div className="ds-stack">
              <Input
                label="Invoice number"
                hint="As printed on the invoice"
                defaultValue="NW-0187"
              />
              <Input
                label="Invoice date"
                hint="YYYY-MM-DD"
                defaultValue="23/11/2026"
                error="Use the format YYYY-MM-DD."
              />
            </div>
          </Item>

          <Item name="Select">
            <Select
              label="Currency"
              defaultValue="USD"
              options={[
                { value: "USD", label: "US dollar (USD)" },
                { value: "EUR", label: "Euro (EUR)" },
                { value: "GBP", label: "Pound sterling (GBP)" },
              ]}
            />
          </Item>

          <Item name="Checkbox">
            <div className="ds-stack">
              <Checkbox
                label="Email me the results"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <Checkbox
                label="I accept the terms"
                error="Accept the terms to continue."
              />
            </div>
          </Item>

          <Item name="Card">
            <Card
              title="invoice-nw-0187.pdf"
              subtitle="Uploaded today"
              headingLevel={4}
              actions={
                <Badge tone="success" icon="✓">
                  Ready
                </Badge>
              }
            >
              <p>A card groups related content under a title row.</p>
            </Card>
          </Item>

          <Item name="Badge">
            <div className="ds-row">
              {TONES.map((tone) => (
                <Badge key={tone} tone={tone}>
                  {tone}
                </Badge>
              ))}
            </div>
          </Item>

          <Item name="Alert">
            <div className="ds-stack">
              {ALERT_TONES.map((tone) => (
                <Alert
                  key={tone}
                  tone={tone}
                  title={tone[0].toUpperCase() + tone.slice(1)}
                >
                  {ALERT_TEXT[tone]}
                </Alert>
              ))}
            </div>
          </Item>

          <Item name="ProgressBar">
            <div className="ds-stack">
              <ProgressBar
                label="Fields resolved"
                value={2}
                max={3}
                valueText="2 of 3 resolved"
              />
              <ProgressBar label="Upload" value={100} />
            </div>
          </Item>

          <Item name="Skeleton">
            <div className="ds-stack" aria-label="Loading example">
              <Skeleton width="60%" height={20} />
              <Skeleton />
              <Skeleton width="80%" />
            </div>
          </Item>

          <Item name="Spinner">
            <div className="ds-row">
              <Spinner />
              <span className="ui-hint">
                Decorative; the control that shows it carries the label.
              </span>
            </div>
          </Item>

          <Item name="Tabs">
            <TabsDemo />
          </Item>

          <Item name="Dialog">
            <DialogDemo />
          </Item>

          <Item name="Toast">
            <ToastButtons />
          </Item>
        </ToastProvider>
      </div>
    </>
  );
}
