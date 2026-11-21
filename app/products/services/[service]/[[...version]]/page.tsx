import { serviceMetadata, ServicePage, serviceStaticParams } from "../../../app-page";

// /products/services/<service> is V1 and /products/services/<service>/v2 is V2 (MVP1-E0-34).
export const dynamicParams = false;
export const generateStaticParams = serviceStaticParams;
export const generateMetadata = serviceMetadata;
export default ServicePage;
