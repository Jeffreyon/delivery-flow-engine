# Next Steps

- App local URL: `http://127.0.0.1:5000`
- Frontend local URL: `http://127.0.0.1:3000`
- Local database: `postgres://postgres@127.0.0.1:6446/delivery_flow_engine`
- Rerun local validation from the scaffolder repo with `npm run scaffold -- continue --project <slug>`.
- Branch pushes deploy to the mapped Railway environments.
- Keep required GitHub Actions secrets in the scaffolder root `.env`; the scaffold syncs them during GitHub provisioning.
- Ensure `RAILWAY_API_TOKEN` is available before GitHub provisioning.
- Review the generated Railway project, environment mapping, and backend variables before the first deploy.
- Fresh Railway installs require `/install?token=26d4585d51fa067d0601b5c39828316bb01243f1b46ac89c` until `APP_INSTALLED=true` is set.
