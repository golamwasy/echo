# Guestbook

A minimal visit-counter app: Spring Boot API + React/TS frontend + Postgres, containerized and routed through Traefik.

- Backend: `GET /api/visits` returns the current count; `POST /api/visits` records a visit and returns the new count. One table (`visit`).
- Frontend: single page that calls `POST /api/visits` on load and displays the count.

## Prerequisites

- Docker + Docker Compose on the host
- An external Docker network named `traefik-net` already created, with Traefik attached to it and watching for container labels
- `echo.golamwasy.dev` resolving to your server

## Deploy

From the repo root:

```bash
docker compose up -d --build
```

This builds the backend and frontend images, starts Postgres, and attaches all three services to `traefik-net`. Traefik should pick up the routers automatically via labels — no restart needed.

## Verify

```bash
curl http://echo.golamwasy.dev/api/visits
```

Then open `http://echo.golamwasy.dev` in a browser — it should show a visit count that increments on each page load.

## Useful commands

```bash
docker compose logs -f backend     # tail backend logs
docker compose ps                  # check container status
docker compose down                # stop everything (keeps the postgres volume)
docker compose down -v             # stop everything and wipe the database
```

## Notes

- No TLS/auth — this is intended for a trusted home network behind Traefik's plain HTTP entrypoint (`web`).
- If your Traefik uses a different entrypoint name than `web`, update the `entrypoints` label in `docker-compose.yml` for both services.
- The frontend calls the API on the same origin (`VITE_API_URL` is empty), routed to the backend via the `/api` path prefix. Change the build arg in `docker-compose.yml` if you split the frontend and API onto different hostnames.
