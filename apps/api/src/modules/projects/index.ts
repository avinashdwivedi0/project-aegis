export { ProjectController } from "./project.controller";
export { ProjectService } from "./project.service";

export {
  createProjectSchema,
  updateProjectSchema,
  projectParamsSchema,
} from "./project.schema";

export type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectParams,
} from "./project.types";

export { default as projectRoutes } from "./project.routes";