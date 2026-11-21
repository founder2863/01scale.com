import { appPage } from "../../app-page";

// /products/p2pflow is V1 and /products/p2pflow/v2 is V2 (MVP1-E0-33).
const page = appPage("p2pflow");

export const dynamicParams = false;
export const generateStaticParams = page.generateStaticParams;
export const generateMetadata = page.generateMetadata;
export default page.Page;
