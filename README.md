Toolforge bun container
=======================

[Build Service][] project creating a container running bun

Publish a new container
-----------------------
```
$ ssh dev.toolforge.org
$ become containers
$ toolforge build start --image-name bun \
  https://gitlab.wikimedia.org/toolforge-repos/containers-bun
```

License
-------
Licensed under the [GPL-3.0-or-later][] license. See [COPYING][] for the full
license.

[Build Service]: https://wikitech.wikimedia.org/wiki/Help:Toolforge/Build_Service
[GPL-3.0-or-later]: https://www.gnu.org/licenses/gpl-3.0.html
[COPYING]: COPYING
