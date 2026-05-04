![GitHub License](https://img.shields.io/github/license/DaxServer/containers-bun?link=https%3A%2F%2Fopensource.org%2Flicense%2FMIT)

# Bun Container for Toolforge

A [Toolforge Build Service][] container that installs [Bun][] for running JavaScript/TypeScript web services.

## Deployment

### Build

```bash
toolforge build start -i web https://github.com/DaxServer/containers-bun.git -L
```

To build from a specific branch:

```bash
toolforge build start -i web https://github.com/DaxServer/containers-bun.git -L --ref <branch-name>
```

### Webservice

When deploying for the first time:

```bash
toolforge webservice buildservice start --buildservice-image tool-<toolname>/web:latest --mount=none
```

For subsequent deployments:

```bash
toolforge webservice restart
```

## Local Build

Requires [Docker Desktop][] and [pack][].

```bash
pack build containers-bun \
  --builder tools-harbor.wmcloud.org/toolforge/heroku-builder:24_0.21.5 \
  --trust-builder \
  --buildpack ./buildpacks/bun \
  --buildpack heroku/go@2.2.2 \
  --buildpack heroku/procfile \
  --env NO_PROXY=archive.ubuntu.com,security.ubuntu.com \
  --env no_proxy=archive.ubuntu.com,security.ubuntu.com
```

`NO_PROXY` is required on Docker Desktop for Mac to prevent apt traffic from being intercepted.

## Development

```bash
go build ./...
go test ./...
```

## License

[MIT](./LICENSE)

[Toolforge Build Service]: https://wikitech.wikimedia.org/wiki/Help:Toolforge/Build_Service
[Bun]: https://bun.sh
[Docker Desktop]: https://www.docker.com/products/docker-desktop/
[pack]: https://buildpacks.io/docs/tools/pack/
