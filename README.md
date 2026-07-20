# Star Farm Dashboard Tools

This workspace contains the source code and documentation for the Star Farm agricultural simulation system.

## Main Components

| Directory | Purpose |
| --- | --- |
| [`Web App`](./Web%20App/) | Complete dashboard application |
| [`Data Studio guide`](./Data%20Studio%20guide/) | Data dashboard documentation and resources |

The `Web App` directory contains three services:

- `backend`: FastAPI service designed for Google Cloud Run.
- `VPS`: FastAPI service packaged with Docker Compose for VPS deployment.
- `frontend`: React, TypeScript, and Vite application deployed on Vercel.

## Getting Started

See [`Web App/README.md`](./Web%20App/README.md) to choose a deployment model and run the complete system.

Service-specific documentation:

- [Backend Service](./Web%20App/backend/README.md)
- [VPS Service](./Web%20App/VPS/README.md)
- [Frontend](./Web%20App/frontend/README.md)

## Production Architecture

```text
Browser
  |
  v
Vercel Frontend + /api/proxy/*
  |
  +--> Cloud Run Backend
  |
  `--> VPS reverse proxy --> Docker/FastAPI
```

The frontend only calls its same-origin proxy. The server-side proxy attaches the production API key, so the key is never exposed to the browser or client bundle.

## Security Notes

- Never commit `.env` files, API keys, GCP credentials, or sensitive data.
- Configure `BACKEND_API_KEY` only in Vercel's server-side environment.
- Always use HTTPS in production.
- Bind the VPS application to `127.0.0.1:8080` and place it behind Nginx or Caddy.

## Demo

[Star Farm Simulation Dashboard](https://star-farm.vercel.app/)
