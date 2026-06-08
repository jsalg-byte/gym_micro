# Future Scaling Constraints

This app is currently designed for very small usage: roughly a couple of users, not necessarily daily. Under that assumption, the current architecture is fine and should stay cheap.

## Current Assumptions

- Expected active users: 1-2 people most days, often fewer.
- Exercise demo videos are short mp4 files.
- Progress photos and future exercise demo videos can share the existing S3-compatible/R2 storage setup.
- Coolify runs the app as a containerized deployment.
- Background demo processing is occasional, not high volume.

## Exercise Demo Videos

Current flow:

1. Save a YouTube source for an exercise.
2. Download/transcode the mp4 with `yt-dlp` and `ffmpeg`.
3. Store the local demo file, or upload it to R2 when `EXERCISE_DEMO_STORAGE_DRIVER=r2`.
4. Render the final mp4 in the app.

Recommended production path:

- Store processed demo videos in R2.
- Use keys like `exercise-demos/<exercise-slug>.mp4`.
- Overwrite replacement demos instead of keeping old versions.
- Keep only one canonical demo per exercise unless there is a strong product reason to version them.
- If `EXERCISE_DEMO_PUBLIC_BASE_URL` is set, render public R2 URLs directly.
- If no public base URL is set, render signed R2 read URLs from the existing S3 credentials.

Cost risk is low at current usage. R2 has free storage and request tiers that should comfortably cover a small private app. The main future cost vector is not bandwidth, because R2 egress is free, but object read operations if the app ever gets many viewers.

## R2 Cost Notes

R2 cost dimensions to remember:

- Storage: total GB-month stored.
- Class A operations: writes, uploads, list operations.
- Class B operations: reads/downloads.
- Egress: free for R2.

For this app, storage is unlikely to matter soon. Example:

- 100 demo videos at 5 MB each is about 500 MB.
- 1,000 demo videos at 5 MB each is about 5 GB.

The more realistic future risk is lots of video views causing many Class B reads. At the current expected usage, this is not a concern.

## Coolify Constraints

Avoid relying on container-local storage for anything important in production.

Container-local files can disappear on rebuilds, redeploys, or server moves. Coolify persistent volumes can solve this on one server, but object storage is better for shared media.

Use Coolify persistent storage only for temporary or low-risk files. Use R2 for media that should survive deployments and be available to all users.

## Background Jobs

The current background video processing approach is acceptable for low volume:

- A server action saves source metadata.
- The app spawns the download/transcode job.
- The job writes the processed output.

This is fine when jobs are rare. If multiple users start processing videos frequently, move this to a real job queue.

Future upgrade path:

- Add a `demo_processing_jobs` table.
- Store job status: `queued`, `processing`, `ready`, `failed`.
- Run a separate worker process in Coolify.
- Process one or two jobs at a time.
- Surface job status in the UI.

## Database Constraints

Current Postgres usage should scale far beyond the expected usage.

Watch for:

- Large unbounded activity tables.
- Upload metadata that is never cleaned up.
- Session/set history queries that become slow without indexes.

For small private usage, this does not need immediate work.

## Media Cleanup

When replacing a demo video:

- Overwrite the same object key when possible.
- If a new key is used, delete the old R2 object.
- Keep the DB/manifest pointed at only the active demo.

For progress photos:

- Continue deleting the R2 object when a progress record is deleted.
- Consider a periodic orphan cleanup later if uploads can fail between object upload and DB save.

## When To Revisit

Revisit architecture if any of these become true:

- More than 20 regular users.
- More than 100 demo videos.
- Users upload their own videos instead of curated shared demos.
- Demo processing happens many times per day.
- R2 usage approaches free-tier limits.
- Coolify deploys multiple app replicas.
- App needs reliable processing status instead of best-effort background jobs.

## Near-Term Recommendation

Do not overbuild yet.

For the current expected usage, the best next step is to upload processed exercise demos to the existing R2 bucket and serve those mp4 URLs from the app. Keep videos curated, short where reasonable, and overwritten on replacement.
