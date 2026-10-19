# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                  # run the full suite (node --test test/*-test.js)
npm run test:cjs          # the suite with require(esm) disabled (see Platform constraints)
npm run test:coverage     # the suite under c8
npm run lint              # npm run typecheck && eslint .
npm run lint:fix          # eslint . --fix
npm run typecheck         # tsc -p tsconfig.json (checkJs against the hand-written .d.ts files, no emit)
npm run format            # prettier --write .
npm run format:check      # prettier --check .
npm run update            # rm -rf node_modules package-lock.json && ncu -u && npm install
```

Run a single test file or a single test by name (Node's built-in test runner):

```bash
node --test test/headers-test.js
node --test --test-name-pattern="Split simple message" test/message-splitter-test.js
```

The full run takes about 90 seconds, almost all of it the rewriter tests that feed a large image very slowly and one byte at a time (`test/rewriter-test.js`). The tests are callback style, `test(name, (t, done) => ...)`, with `t.plan(n)` where the original nodeunit suite counted assertions, so assertions go through `t.assert.*` (only those count toward the plan). Linear-time regressions are guarded with `test/helpers/assert-linear.js`, which compares the runtime at one input size against four times that size rather than using absolute limits.

Benchmarks are not wired into npm scripts: `cd bench && ./bench.sh` (needs the `random-message` dev dependency).

## Critical constraints

- **CommonJS only, never ESM.** All source uses `require`/`module.exports` with a global `'use strict'`. See Platform constraints below.
- **Untrusted input.** Everything here parses arbitrary mail from the network. Parsing must stay linear in the input size (several past fixes replaced backtracking regexes and quadratic splices, each pinned by an `assert-linear` test) and memory must stay bounded (`maxHeadSize`, `MAX_CHILD_NODES`, the pending-line limits in `lib/message-splitter.js`). Boundary handling is security sensitive: a closing boundary must end its multipart, so that content after it can not be smuggled in as a node. See `SECURITY.md`.
- **Round trip fidelity.** Splitting and joining an unmodified message must reproduce the original bytes exactly. Many tests assert this, at several write chunk sizes, so parsing must never depend on where the writes happen to fall.
- **Types are hand-written.** `index.d.ts`, `lib/*.d.ts` and `lib/types.d.ts` are maintained by hand and shipped; `tsconfig.json` only type-checks the JS against them (`checkJs`, `noEmit`). Update the declarations when changing a public signature.
- **Releases are automated via release-please** (`release-please-config.json`, `.github/workflows/release.yaml`, npm trusted publishing). Do not bump `version` or edit `CHANGELOG.md` by hand.
- **ESLint uses the shared flat config** (`eslint.config.js`, ESLint 10), the CommonJS template shared across the Postal Systems / Nodemailer packages. Keep it identical to the other repos except for the "Repo-specific" block at the end. CI (`.github/workflows/test.yml`) runs lint (including the type check), `format:check` and the tests on Node 20, 22 and 24.

## Platform constraints

Both rules come from EmailEngine, which ships as a `@yao-pkg/pkg` binary: pkg snapshots a CommonJS module graph and cannot load ES modules.

- **Node.js 20 is the minimum supported version.** Runtime code, tests and tooling must work on Node 20, 22 and 24 (`engines.node` is `>=20.0.0`).
- **Everything that reaches runtime must be genuinely CommonJS-loadable.** `require()` of this package and of every runtime dependency, transitive ones included, must work with `--no-experimental-require-module`. Node 22+ (and 20.19) can `require()` an ES module by default, which hides an ESM-only dependency until the pkg binary fails. A CommonJS entry that only wraps a dynamic `import()` does not count. (The `import(...)` occurrences in `lib/` are JSDoc type references, not runtime imports.)
- **Check:** `npm run test:cjs` runs the whole suite with `NODE_OPTIONS=--no-experimental-require-module`. Run it after `npm run update` or any dependency change; CI runs it on Node 22 and 24.
- Never add or upgrade to an ESM-only dependency. When a dependency's next major is ESM-only or needs more than Node 20, pin the last working major in `.ncurc.js` (`reject`, or a `target` of `minor`/`patch`) with a comment giving the reason.

## Architecture

`index.js` exports seven classes; all but `Headers`, `MimeNode` and `ChunkedPassthrough` are streams.

- `Splitter` (`lib/message-splitter.js`): a Transform from bytes to an object stream. It processes the input line by line and emits `node` objects (a `MimeNode` with parsed headers), `body` chunks belonging to the last node, and `data` chunks for everything between parts (boundaries, preamble, epilogue). It tracks the multipart tree and its boundaries, parses embedded `message/rfc822` parts unless `ignoreEmbedded` is set, and enforces the size and child count limits.
- `Joiner` (`lib/message-joiner.js`): the reverse, turning the object stream back into bytes (a node's rebuilt headers, then body and data chunks as they come).
- `MimeNode` (`lib/mime-node.js`): one MIME part. Parses Content-Type, Content-Disposition, Content-Transfer-Encoding, charset, filename (including RFC 2231 continuations) and provides `getDecoder()` / `getEncoder()` for base64 and quoted-printable via `libbase64` / `libqp`.
- `Headers` (`lib/headers.js`): parsed header block that keeps the original lines, so that an unmodified block rebuilds byte for byte; supports get/add/update/remove and guards against header injection through line breaks in values.
- `Rewriter` (`lib/node-rewriter.js`) and `Streamer` (`lib/node-streamer.js`): sit between a Splitter and a Joiner and hand the decoded body of matching nodes to the caller, either to replace it (`Rewriter`, re-encoded on the way out) or to read it (`Streamer`). Both decode `format=flowed` text through `lib/flowed-decoder.js`.
- `ChunkedPassthrough` (`lib/chunked-passthrough.js`): collects small writes into larger chunks before passing them on.

`examples/rewrite-html.js` shows the usual Splitter -> Rewriter -> Joiner pipeline.

Known consumers: EmailEngine, WildDuck, ZoneMTA, mailparser, ImapFlow and email-content.

## Conventions

These mirror the conventions used across Postal Systems projects (see `../emailengine`). This is a zone-eu repository co-maintained with Zone; their commits often add a scope and a ticket id (`fix(message-splitter): ZMS-217 ...`) and land through pull requests.

**Git commits**

- Use Conventional Commits: `fix:` (patch release), `feat:` (minor release), and `chore:`/`build:`/`ci:`/`docs:`/`refactor:`/`style:`/`test:` for changes that should not trigger a release. Dependency bumps that should ship use `fix(deps):` or `fix: bump ...`. release-please derives the version and changelog from these prefixes.
- Do **not** list Claude or any AI assistant as a co-author / co-contributor in commit messages or PR descriptions (no `Co-Authored-By` trailer).
- Append `[skip ci]` to commits that do not change runtime behavior (docs, comments, CI/workflow tweaks, formatting) to avoid spending CI minutes. Exception: never add `[skip ci]` to a `fix:` or `feat:` commit, those must run so the release workflow triggers. GitHub reads the marker off the head commit of a push, so when a push mixes the two, the release-triggering commit has to be last.

**Code & docs style**

- No emojis anywhere in code or documentation, printable ASCII only.
- Use a single hyphen-minus (`-`) as a dash in user-facing strings and docs. Never use double hyphens (`--`), em dashes, or en dashes.

**Before committing code changes**

1. `npm run format` and `npm run lint`
2. `npm test`
3. For non-trivial changes, consider `/simplify` (quality cleanup) and `/security-review`. Anything touching the splitter, boundary handling or header parsing is security sensitive.

**After pushing**

- Check the workflow runs for the push (`gh run list --branch <branch>`) and report their status. If a run fails for an unrelated/infrastructure reason (checkout reporting "account suspended", HTTP 403, other auth errors), check <https://www.githubstatus.com/> for an active GitHub incident before assuming the change caused it.
