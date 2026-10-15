# Synthetic monitoring tests: agent instructions

This repository holds the pages, user journeys and configuration for Wikimedia's synthetic web performance tests (sitespeed.io, Browsertime and WebPageReplay). The test servers pull it automatically, so a merged change runs in production on the next test iteration.

Before you change tests, configuration or anything on the test servers, read [`.claude/skills/synthetic-testing/SKILL.md`](.claude/skills/synthetic-testing/SKILL.md). It is the single source of instructions for all agents (Claude Code loads it automatically). It points to these references; read the one that matches your task:

- [`references/infrastructure.md`](.claude/skills/synthetic-testing/references/infrastructure.md): servers, how tests run, Graphite and result storage
- [`references/runbook.md`](.claude/skills/synthetic-testing/references/runbook.md): restart and debug, and what to do when an alert fires
- [`references/webpagereplay-stability.md`](.claude/skills/synthetic-testing/references/webpagereplay-stability.md): what makes replay metrics unstable and what was already tested

Keep instructions in those files, not here, so they do not drift apart. This repository is public: never add secrets, server addresses or access details.
