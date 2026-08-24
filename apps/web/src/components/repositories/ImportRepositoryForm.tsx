import { useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  loading: boolean;
  onSubmit: (url: string) => Promise<void> | void;
};

export default function ImportRepositoryForm({
  loading,
  onSubmit,
}: Props) {
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const value = url.trim();

    if (!value) return;

    void onSubmit(value);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label
          htmlFor="repository-url"
          className="text-sm font-medium"
        >
          GitHub Repository URL
        </label>

        <input
          id="repository-url"
          type="url"
          value={url}
          disabled={loading}
          placeholder="https://github.com/owner/repository"
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
          required
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={loading || !url.trim()}
        >
          {loading ? "Importing..." : "Import Repository"}
        </Button>
      </div>
    </form>
  );
}