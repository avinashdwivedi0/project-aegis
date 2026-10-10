export type DiscoveredHttpRoute = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  filePath: string;
  line: number;
  handlerSource: string;
};

export type IntegrationDiscoveryResult = {
  contractFiles: string[];
  contractKind: "openapi" | "swagger" | "graphql" | "none";
  routes: DiscoveredHttpRoute[];
};
