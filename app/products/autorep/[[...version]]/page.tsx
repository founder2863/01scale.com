import { appPage } from "../../app-page";

// /products/autorep is V1 and /products/autorep/v2 is V2 (MVP1-E0-33).
const page = appPage("autorep");

export const dynamicParams = false;
export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
