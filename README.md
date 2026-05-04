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

## Development

```bash
go build ./...
go test ./...
```

## License

[MIT](./LICENSE)

[Toolforge Build Service]: https://wikitech.wikimedia.org/wiki/Help:Toolforge/Build_Service
[Bun]: https://bun.sh
