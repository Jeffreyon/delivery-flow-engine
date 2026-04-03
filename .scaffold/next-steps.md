# Next Steps

- App local URL: `http://127.0.0.1:5000`
- Frontend local URL: `http://127.0.0.1:3000`
- Local database: `postgres://postgres@127.0.0.1:6446/delivery_flow_engine`
- Rerun local validation from the scaffolder repo with `npm run scaffold -- continue --project <slug>`.
- Branch pushes deploy to the mapped Railway environments.
- Keep required GitHub Actions secrets in the scaffolder root `.env`; the scaffold syncs them during GitHub provisioning.
- Ensure `RAILWAY_API_TOKEN` is available before GitHub provisioning.
- Review `.scaffold/project.json` and `.github/workflows/railway-deploy.yml` before changing deploy topology so service names, environment mapping, and migration behavior stay aligned.
- The shared backend Dockerfile now routes Railway startup by `RAILWAY_SERVICE_NAME`, so the `worker` service can deploy from the `backend` path without a separate Dockerfile.
- Keep `REDIS_URL`, `BULLMQ_PREFIX`, and `WORKER_CONCURRENCY` aligned on the Railway `worker` service whenever the queue runtime changes.
- Treat root-manifest or install-token guidance as unavailable unless the runtime and docs in this repo explicitly add it later.
