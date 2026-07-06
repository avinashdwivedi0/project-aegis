import { useState } from "react";

import type {
  CreateProjectInput,
  Project,
  ProjectStatus,
  ProjectVisibility,
  UpdateProjectInput,
} from "@/types/project";

type FormData = {
  name: string;
  description: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
};

type Props<
  T extends
    | CreateProjectInput
    | UpdateProjectInput
> = {
  initialData?: Project;
  loading?: boolean;
  submitText?: string;
  onSubmit: (
    data: T
  ) => void | Promise<void>;
};

function ProjectForm<
  T extends
    | CreateProjectInput
    | UpdateProjectInput
>({
  initialData,
  loading = false,
  submitText = "Save Project",
  onSubmit,
}: Props<T>) {
  const isEditing = Boolean(initialData);

  const [form, setForm] = useState<FormData>({
    name: initialData?.name ?? "",
    description:
      initialData?.description ?? "",
    status:
      initialData?.status ?? "ACTIVE",
    visibility:
      initialData?.visibility ??
      "PRIVATE",
  });

  function handleChange(
    e: React.ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const payload = {
      name: form.name.trim(),
      description:
        form.description.trim() || "",
      ...(isEditing && {
        status: form.status,
        visibility: form.visibility,
      }),
    } as T;

    await onSubmit(payload);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div>
        <label className="mb-2 block text-sm font-medium">
          Project Name
        </label>

        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          minLength={3}
          maxLength={100}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-500"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Description
        </label>

        <textarea
          name="description"
          rows={4}
          value={form.description}
          onChange={handleChange}
          className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-500"
        />
      </div>

      {isEditing && (
        <>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Status
            </label>

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-500"
            >
              <option value="ACTIVE">
                Active
              </option>

              <option value="COMPLETED">
                Completed
              </option>

              <option value="ARCHIVED">
                Archived
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Visibility
            </label>

            <select
              name="visibility"
              value={form.visibility}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-500"
            >
              <option value="PRIVATE">
                Private
              </option>

              <option value="TEAM">
                Team
              </option>

              <option value="PUBLIC">
                Public
              </option>
            </select>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={
            loading ||
            form.name.trim().length < 3
          }
          className="rounded-xl bg-cyan-600 px-6 py-3 font-medium transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : submitText}
        </button>
      </div>
    </form>
  );
}

export default ProjectForm;