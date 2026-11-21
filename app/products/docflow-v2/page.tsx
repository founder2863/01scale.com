import type { Metadata } from "next";
import { AppPage } from "../app-page";
import { APPS, appLabel } from "../apps";

export const metadata: Metadata = {
  title: `${appLabel("docflow", "V2")} — 01scale`,
  description: APPS.docflow.tagline,
};

export default function Page() {
  return <AppPage app="docflow" version="V2" />;
}
