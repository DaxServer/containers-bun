import functools
import pathlib

import jinja2

TEMPLATE_DIR = pathlib.Path(__file__).parent / "templates"


@functools.cache
def template_environment():
    """Get a jinja2 environment."""
    return jinja2.Environment(
        loader=jinja2.FileSystemLoader(TEMPLATE_DIR),
        trim_blocks=True,
        lstrip_blocks=True,
    )


def expand_template(name, context):
    """Expand a jinja2 template."""
    env = template_environment()
    tmpl = env.get_template(name)
    data = tmpl.render(**context)
    if data is None:
        raise RuntimeError(f"Generated empty {name} file")
    return data


def generate_config(config_file_path, template, context):
    """Generate a configuration file."""
    config_dir = config_file_path.parent
    config_dir.mkdir(mode=0o770, parents=True, exist_ok=True)
    config_file_path.touch(mode=0o660, exist_ok=True)
    config_file_path.write_text(expand_template(template, context))
