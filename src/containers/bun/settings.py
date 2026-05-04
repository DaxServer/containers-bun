import pathlib

import environ

env = environ.Env()
env.smart_cast = False
environ.Env.read_env(env_file=pathlib.Path.cwd() / ".env")

# == bun settings ==
