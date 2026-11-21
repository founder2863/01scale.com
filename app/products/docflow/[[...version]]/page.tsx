import { appPage } from "../../app-page";

// /products/docflow is V1 and /products/docflow/v2 is V2 (MVP1-E0-33).
const page = appPage("docflow");

export const dynamicParams = false;
export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
