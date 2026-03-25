# Docker Monitor

A TypeScript service that discovers running Docker containers and streams their logs to the terminal and an optional Telegram bot. Terminal output remains JSON lines. Telegram messages contain only the container name, Docker timestamp, and the complete log in a copyable code block.

## Requirements

- Node.js 22 or newer.
- Docker CLI installed and available on PATH.
- Access to the Docker daemon selected by your current Docker context or Docker environment variables.

## Run

```sh
npm install
cp .env.example .env
npm run dev
```

For a compiled build:

```sh
npm run build
npm start
```

Stop with Ctrl+C or SIGTERM. The monitor closes its Docker CLI processes without stopping your containers. An initial connection failure exits with code 1; later discovery failures are reported and retried.

## Run on a Linux server with Docker

Install Docker Engine and Docker Compose on the server. Copy the project, create `.env` from `.env.example` if it does not already exist, and fill in the Telegram credentials. No host Node.js installation is needed.

```sh
docker compose up -d --build
docker compose logs -f --tail 50 monitor
```

The image builds TypeScript in a separate stage. The runtime contains Node.js, the Docker CLI, and compiled application files; development dependencies and `.env` are excluded from the image. Compose injects `.env` at runtime, restarts the service after failures or host reboots, and rotates terminal logs.

The host Docker socket is mounted into the service. The container runs as root to access the standard root-owned socket. Socket access grants control over the host Docker daemon, even with a read-only bind mount; deploy this service only on a trusted host. The default socket path targets a standard Linux Docker Engine installation.

Subscriber IDs and the Telegram polling offset persist in the `monitor-data` named volume at `/app/data/users.json`. Compose fixes the users file to that mounted path. Normal rebuilds and `docker compose down` retain this data; `docker compose down -v` deletes it.

```sh
docker compose down
```

The monitor image has the label `docker-monitor.exclude=true`, so the collector skips its own logs and avoids a feedback loop. Add the same label to any other container you want to exclude. Telegram uses outbound connections; no inbound ports are required.

## Configuration

The application loads `.env` from the working directory automatically. Existing process environment variables take precedence. Telegram is disabled when both credentials are empty; setting only one credential is an error.

| Variable | Default | Meaning |
| --- | --- | --- |
| `POLL_INTERVAL_MS` | `3000` | Container discovery interval, at least 250 ms. |
| `LOG_TAIL_LINES` | `5` | Historical lines per container on first attachment, followed by live logs; use 0 for only new logs. |
| `CONTAINER_NAME` | unset | Optional Docker name filter, which matches all or part of a name. |
| `TELEGRAM_BOT_TOKEN` | unset | Bot token from BotFather. |
| `TELEGRAM_ACCESS_PASSWORD` | unset | Separate shared password for subscriber registration. |
| `TELEGRAM_USERS_FILE` | `data/users.json` | Persistent private chat IDs and Telegram update offset. |

```sh
CONTAINER_NAME=web LOG_TAIL_LINES=50 npm run dev
```

## Telegram setup

1. Create a dedicated bot with Telegram's BotFather.
2. Put its token and your chosen access password in `.env`:

```dotenv
TELEGRAM_BOT_TOKEN=123456:replace_with_bot_token
TELEGRAM_ACCESS_PASSWORD=replace-with-a-strong-password
TELEGRAM_USERS_FILE=data/users.json
```

3. Start the monitor with `npm run dev`.
4. Open a private chat with the bot, send `/start`, then send the access password. `/start YOUR_PASSWORD` also works.

Successful registration saves the private chat ID once. Subscribers receive subsequent collected logs and stay registered across restarts. Send `/stop` to unsubscribe. Group and channel messages cannot register recipients. Bot replies and subscription instructions are in English.

The users file is created automatically with owner-only permissions and atomic replacements. Keep `data/` persistent when deploying. Use one monitor process per bot and users file. The bot uses long polling; an existing webhook is reported as a startup error and is not removed automatically. Changing the access password affects future registrations; existing subscribers remain subscribed.

## Telegram message format

Container name and Docker timestamp appear above a code block containing the full log. For JSON objects and arrays, only whitespace outside strings is reformatted. All fields, number literals, and string escapes are preserved. Plain text is preserved as received. HTML-sensitive log characters and backticks display literally.

Example of the visible message:

```text
Container: worker
Time: 2026-01-01T00:00:00.000000000Z

{
  "level": 60,
  "msg": "Worker failed",
  "err": {
    "message": "Connection failed"
  }
}
```

Long logs are split into ordered code blocks without truncating the content; each part repeats the container name and time. The bot token and access password are redacted from log output. Internal monitor diagnostics stay in the terminal.

Messages are serialized with at least 1.1 seconds between send attempts. Temporary API failures are retried, including Telegram's `retry_after` response. The in-memory delivery queue holds 500 logs; if collection outpaces delivery, the oldest pending log is dropped and a terminal diagnostic is emitted. Pending deliveries are not persisted and are discarded on shutdown. A network timeout can cause duplicate delivery if Telegram accepted the original request before the response was lost.

## Behavior and scope

- Discovers running containers at startup and on each poll.
- Follows stdout and stderr with Docker timestamps.
- Reattaches after a log stream closes, resuming from the most recent observed timestamp.
- Keeps a timestamp cursor for previously seen containers during the current monitor process.
- Separates Docker log collection from the output sink. Add another sink using `src/types/logging/logSink.ts` and pass it to `runMonitor`.

Discovery uses polling, so containers that start and finish entirely between polls may be missed. Reconnection may repeat entries at the timestamp boundary; delivery is best effort and Docker log cursors are not persisted across monitor restarts. TTY containers merge stdout and stderr in Docker. Only logs exposed by `docker logs` are available; application log files inside containers are outside this version's scope. Resource metrics and persistent log storage are not included yet.

Docker CLI diagnostics from a log-follow process can also appear as stderr entries. Monitor diagnostics include `source: 'monitor'`.

## Validation

```sh
npm run check
npm run build
npm test
```

Tests use an isolated Docker CLI fixture and mocked Telegram HTTP responses. They verify multi-container output, stream separation, reconnection, shutdown, password registration, persistent users, unsubscription, polling offsets, API retries, secret redaction, JSON preservation, HTML escaping, and long-message splitting. Tests do not send real Telegram messages.

The collector follows the official [Docker logs](https://docs.docker.com/reference/cli/docker/container/logs/) and [Docker container list](https://docs.docker.com/reference/cli/docker/container/ls/) interfaces.

Telegram integration follows the official [Bot API](https://core.telegram.org/bots/api), using `getUpdates` for registration and `sendMessage` with HTML code blocks for log delivery.
