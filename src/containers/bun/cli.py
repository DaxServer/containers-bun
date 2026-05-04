import logging
import os
import pathlib
import sys

import click
import coloredlogs

from . import settings
from . import utils
from .version import __version__

logger = logging.getLogger(__name__)


@click.group()
@click.version_option(version=__version__)
@click.option(
    "-v",
    "--verbose",
    count=True,
    help="Increase debug logging verbosity",
)
@click.pass_context
def main(ctx, verbose):
    """Setup and run bun."""

    coloredlogs.install(
        level=max(logging.DEBUG, logging.WARNING - (10 * verbose)),
        fmt="%(asctime)s %(name)s %(levelname)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
        level_styles=coloredlogs.DEFAULT_LEVEL_STYLES
        | {
            "debug": {},
            "info": {"color": "green"},
        },
        field_styles=coloredlogs.DEFAULT_FIELD_STYLES
        | {
            "asctime": {"color": "yellow"},
        },
    )
    logging.captureWarnings(True)

    ctx.obj = {
        # Fill with replacement values for templates
    }


@main.command()
@click.pass_context
def bun(ctx):
    """Run bun"""
    logger.info("Generating config")
    config_dir = pathlib.Path.cwd() / ".config"

    utils.generate_config(
        config_dir / "bun.conf",
        "bun.conf",
        ctx.obj,
    )

    logger.info("Starting bun")
    sys.stdout.flush()
    sys.stderr.flush()
    os.execlp(
        "bun",
        "bun",
    )


if __name__ == "__main__":  # pragma: nocover
    main()
