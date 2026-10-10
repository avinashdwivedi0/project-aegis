export type InferredFormField = {
  name?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  type: string;
  required: boolean;
  minLength?: number;
};

export type InferredPageForm = {
  route: string;
  component: string;
  filePath: string;
  submitHandler: string;
  submitLabel: string;
  fields: InferredFormField[];
  apiPath: string;
  redirectsToDashboard: boolean;
};

export type SignupLoginFlow = {
  name: string;
  frontendRoutes: string[];
  signup: InferredPageForm;
  login: InferredPageForm;
  sourceEvidence: string[];
};
