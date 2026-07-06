import axios from "axios";

export function getErrorMessage(
  error: unknown
): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ??
      "Server error."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}