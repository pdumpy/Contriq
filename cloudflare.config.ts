import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  accountId: "615e6607c3d24d43995bcfc37211d45b",
  worker: defineWorker({
    name: "contriq-oswarteck",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-23",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: true,
    previewUrls: false,
    placement: { region: "aws:ap-south-1" },
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: [
        "/*",
        "!/_next/static/*",
        "!/*/_next/static/*",
        "!/brand/*",
        "!/fonts/*",
        "!/people/*",
      ],
    },
    env: {
      ASSETS: bindings.assets(),
      CONTRIQ_DB: bindings.hyperdrive({
        id: "1bd95381d0a942a183e877b17b5e81d8",
        dev: { connectionString: "postgresql://contriq_reader@127.0.0.1:55438/contriq" },
      }),
    },
    observability: {
      enabled: true,
      redactQueryString: true,
      traces: { enabled: true, headSamplingRate: 0.01 },
    },
  }),
});
