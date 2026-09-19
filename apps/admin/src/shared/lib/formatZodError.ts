import type { ZodError } from "zod";

// A Zod issue list flattened into one line, so a validation failure shows
// up in ProjectForm's existing error banner (which just renders
// err.message) as something readable, not a JSON dump of issue objects.
export function formatZodError(error: ZodError): string {
    return error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ");
}
