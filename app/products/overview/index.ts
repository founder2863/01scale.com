import type { AppKey } from "../apps";
import type { AppOverviewData } from "../app-overview";
import { autorepOverview } from "./autorep";
import { docflowOverview } from "./docflow";

// Every app's Overview content (MVP1-E0-50). An app with a side menu gets its Overview only from here.
export const OVERVIEWS: Partial<Record<AppKey, AppOverviewData>> = {
  docflow: docflowOverview,
  autorep: autorepOverview,
};
