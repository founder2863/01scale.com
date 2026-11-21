import type { Metadata } from "next";
import { AppPage } from "../app-page";
import { APPS, appLabel } from "../apps";

export const metadata: Metadata = {
  title: `${appLabel("autorep", "V1")} — 01scale`,
  description: APPS.autorep.tagline,
};

export default function Page() {
  return <AppPage app="autorep" version="V1" />;
}
