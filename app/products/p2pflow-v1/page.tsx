import type { Metadata } from "next";
import { AppPage } from "../app-page";
import { APPS, appLabel } from "../apps";

export const metadata: Metadata = {
  title: `${appLabel("p2pflow", "V1")} — 01scale`,
  description: APPS.p2pflow.tagline,
};

export default function Page() {
  return <AppPage app="p2pflow" version="V1" />;
}
