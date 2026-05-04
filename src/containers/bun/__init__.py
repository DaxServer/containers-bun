from . import cli
from .version import __version__  # noqa: F401 imported but unused

if __name__ == "__main__":  # pragma: nocover
    cli.main()
