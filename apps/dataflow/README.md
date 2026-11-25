# CMU Maps dataflow

Loads campus floorplan JSON from the `cmumaps` S3 bucket and refills the database.

The server does not need to be running. Restart it afterward so the in-memory search index and graph cache rebuild.

```zsh
bun run --filter @cmumaps/dataflow populate
```

`S3_ENDPOINT`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY` are required. The script writes through the Drizzle client in `@cmumaps/db`, which reads `DATABASE_URL`.
