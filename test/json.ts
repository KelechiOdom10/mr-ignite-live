import { z } from "zod";

// Kept free of Node imports: the dev server's fixtures mode loads it inside the worker.
export const JsonSchema = z.json();

export type Json = z.infer<typeof JsonSchema>;
