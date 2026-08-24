import { useState } from "react";

import type {
  CreateRepositoryInput,
  Repository,
  RepositoryProvider,
  RepositoryStatus,
  UpdateRepositoryInput,
} from "@/types/repository";

type FormData = {
  name: string;
  description: string;
  provider: RepositoryProvider;
  status: RepositoryStatus;
  url: string;
  defaultBranch: string;
  isPrivate: boolean;
};

type Props<
  T extends
    | CreateRepositoryInput
    | UpdateRepositoryInput
> = {
  initialData?: Repository;
  loading?: boolean;
  submitText?: string;
  onSubmit: (
    data: T
  ) => void | Promise<void>;
};

function RepositoryForm<
  T extends
    | CreateRepositoryInput
    | UpdateRepositoryInput
>({
  initialData,
  loading = false,
  submitText = "Save Repository",
  onSubmit,
}: Props<T>) {
  const isEditing = Boolean(initialData);

  const [form, setForm] =
    useState<FormData>({
      name: initialData?.name ?? "",
      description:
        initialData?.description ?? "",
      provider:
        initialData?.provider ??
        "LOCAL",
      status:
        initialData?.status ??
        "ACTIVE",
      url: initialData?.url ?? "",
      defaultBranch:
        initialData?.defaultBranch ??
        "main",
      isPrivate:
        initialData?.isPrivate ?? false,
    });

  const isGitHub =
    form.provider === "GITHUB";

  function handleChange(
    e: React.ChangeEvent<
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
    >
  ) {
    const target = e.target;

    const value =
      target instanceof HTMLInputElement &&
      target.type === "checkbox"
        ? target.checked
        : target.value;

    setForm((prev) => ({
      ...prev,
      [target.name]: value,
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

      provider: form.provider,

      url: form.url.trim() || undefined,

      defaultBranch:
        form.defaultBranch.trim() ||
        undefined,

      isPrivate: form.isPrivate,

      ...(isEditing && {
        status: form.status,
      }),
    } as T;

    await onSubmit(payload);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Name */}

      <div>
        <label className="mb-2 block text-sm font-medium">
          Repository Name
        </label>

        <input
          name="name"
          required
          minLength={3}
          maxLength={150}
          value={form.name}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-500"
        />
      </div>

      {/* Description */}

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

      {/* Provider */}

      <div>
        <label className="mb-2 block text-sm font-medium">
          Provider
        </label>

        <select
          name="provider"
          value={form.provider}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-500"
        >
          <option value="LOCAL">
            Local
          </option>

          <option value="GITHUB">
            GitHub
          </option>

          <option value="ZIP">
            ZIP Archive
          </option>
        </select>
      </div>

      {/* Default Branch */}

      <div>
        <label className="mb-2 block text-sm font-medium">
          Default Branch
        </label>

        <input
          name="defaultBranch"
          value={form.defaultBranch}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-500"
        />
      </div>

      {/* Repository URL */}

      <div>
        <label className="mb-2 block text-sm font-medium">
          {isGitHub
            ? "GitHub Repository URL"
            : "Repository URL"}
        </label>

        <input
          name="url"
          type="url"
          value={form.url}
          required={isGitHub}
          onChange={handleChange}
          placeholder="https://github.com/owner/repository"
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-cyan-500"
        />
      </div>

      {/* Private */}

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name="isPrivate"
          checked={form.isPrivate}
          onChange={handleChange}
          className="h-4 w-4"
        />

        <span className="text-sm">
          Private Repository
        </span>
      </label>

      {/* Status (Edit only) */}

      {isEditing && (
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

            <option value="INDEXING">
              Indexing
            </option>

            <option value="INDEXED">
              Indexed
            </option>

            <option value="FAILED">
              Failed
            </option>

            <option value="ARCHIVED">
              Archived
            </option>
          </select>
        </div>
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
export default RepositoryForm;