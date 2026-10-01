# Publishing a Mxsify update

Any account with write access to this repo can publish an update. There is no owner allowlist.

1. Raise `version` in package.json. It must be higher than the latest GitHub release.
2. Commit and push to `main`. That push starts the Windows workflow.
3. The workflow uploads `Mxsify-Setup-<version>.exe` to the public release `v<version>`.
4. Installed apps download that file. Settings can point the feed at another public repo written as `owner/name`.

Do not add a list of approved publishers.
