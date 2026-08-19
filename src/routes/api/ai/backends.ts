import { createFileRoute } from "@tanstack/react-router";
import { listCliBackends } from "@/lib/ai/cli-backends";

export const Route = createFileRoute("/api/ai/backends")({
  server: {
    handlers: {
      GET: async () => {
        const clis = await listCliBackends();
        return Response.json({
          clis,
          grokApi: Boolean(process.env.XAI_API_KEY),
        });
      },
    },
  },
});
