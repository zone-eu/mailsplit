# Changelog

## [5.4.16](https://github.com/zone-eu/mailsplit/compare/v5.4.15...v5.4.16) (2026-08-31)


### Bug Fixes

* **deps:** update libmime to 5.4.3 for the CP932 extended areas ([a45c2c8](https://github.com/zone-eu/mailsplit/commit/a45c2c80d2c83517a64b78869d5abebcbc1825be))

## [5.4.15](https://github.com/zone-eu/mailsplit/compare/v5.4.14...v5.4.15) (2026-08-07)


### Bug Fixes

* close MIME boundary smuggling and header injection holes ([028a6fc](https://github.com/zone-eu/mailsplit/commit/028a6fc4c8e6c46a52326d8fa6587829bd76c9d0))
* close MIME boundary smuggling and header injection holes ([#59](https://github.com/zone-eu/mailsplit/issues/59)) ([23b1bbd](https://github.com/zone-eu/mailsplit/commit/23b1bbd3b5bc03bbd9a42bf6f69b11e6b11dd962))
* resolve boundary owners exactly and stop rebuilding broken headers ([06a1159](https://github.com/zone-eu/mailsplit/commit/06a1159855638d1a52b2e42e21e688f774e3b538))

## [5.4.14](https://github.com/zone-eu/mailsplit/compare/v5.4.13...v5.4.14) (2026-07-05)


### Bug Fixes

* update dependencies (libmime 5.4.1) ([5020eb5](https://github.com/zone-eu/mailsplit/commit/5020eb5d493b08fc15642c7b734a9f0a95d7fb18))

## [5.4.13](https://github.com/zone-eu/mailsplit/compare/v5.4.12...v5.4.13) (2026-06-25)


### Bug Fixes

* bumped libmime ([ed8059c](https://github.com/zone-eu/mailsplit/commit/ed8059c2e14640e815d9a74fbae42d46e1a47705))

## [5.4.12](https://github.com/zone-eu/mailsplit/compare/v5.4.11...v5.4.12) (2026-05-26)


### Bug Fixes

* fix ts2300 error ([#55](https://github.com/zone-eu/mailsplit/issues/55)) ([42f2196](https://github.com/zone-eu/mailsplit/commit/42f2196c72417fc366249b2c392dc9e6cab0a88e))

## [5.4.11](https://github.com/zone-eu/mailsplit/compare/v5.4.10...v5.4.11) (2026-05-19)


### Bug Fixes

* Add jsdoc to funcs ([#52](https://github.com/zone-eu/mailsplit/issues/52)) ([efb3d3c](https://github.com/zone-eu/mailsplit/commit/efb3d3c9582d4cdd620e8e8821b01df34a979b08))

## [5.4.10](https://github.com/zone-eu/mailsplit/compare/v5.4.9...v5.4.10) (2026-05-14)


### Bug Fixes

* add mimenode export ([#51](https://github.com/zone-eu/mailsplit/issues/51)) ([0a4e261](https://github.com/zone-eu/mailsplit/commit/0a4e261090df664d771af32493deb48334bf5dfb))
* Bump minimatch and grunt ([#50](https://github.com/zone-eu/mailsplit/issues/50)) ([08d10f8](https://github.com/zone-eu/mailsplit/commit/08d10f8d00d2362ce85a7ee2058ecc5cad9789aa))
* ZMS-63: Add types to project ([#48](https://github.com/zone-eu/mailsplit/issues/48)) ([ab58791](https://github.com/zone-eu/mailsplit/commit/ab587910d32d0341cfaea130fa7d9172ef53f53e))

## [5.4.9](https://github.com/zone-eu/mailsplit/compare/v5.4.8...v5.4.9) (2026-04-09)


### Bug Fixes

* ZMS-47: Fix utf-8 header round-trip in Headers.add() ([#46](https://github.com/zone-eu/mailsplit/issues/46)) ([629928b](https://github.com/zone-eu/mailsplit/commit/629928b1eb22f4ae2753b13eb1df633460b994b2))

## [5.4.8](https://github.com/zone-eu/mailsplit/compare/v5.4.7...v5.4.8) (2025-12-08)


### Bug Fixes

* Bump js-yaml from 3.14.1 to 3.14.2 ([#40](https://github.com/zone-eu/mailsplit/issues/40)) ([3646711](https://github.com/zone-eu/mailsplit/commit/3646711edda6709f2f4f3ba9bfe56656be65da8a))
* **workflows:** ZMSA-46: update workflows ([#41](https://github.com/zone-eu/mailsplit/issues/41)) ([1c95d43](https://github.com/zone-eu/mailsplit/commit/1c95d43a892f1079491a529e47098f84e03478bc))

## [5.4.7](https://github.com/zone-eu/mailsplit/compare/v5.4.6...v5.4.7) (2025-10-16)


### Bug Fixes

* scope package, update release workflow ([#36](https://github.com/zone-eu/mailsplit/issues/36)) ([c5cff6e](https://github.com/zone-eu/mailsplit/commit/c5cff6ec32c3bf6214bda82da2f4458524dca1c0))

## [5.4.6](https://github.com/zone-eu/mailsplit/compare/v5.4.5...v5.4.6) (2025-07-22)


### Bug Fixes

* **chunkedpassthrough:** ZMS-248 Add ChunkedPassthrough to collect buffer before passing to next stream ([#34](https://github.com/zone-eu/mailsplit/issues/34)) ([b4606d0](https://github.com/zone-eu/mailsplit/commit/b4606d05003c253e6eaf5ebdce6df8f1179ffe88))

## [5.4.5](https://github.com/zone-eu/mailsplit/compare/v5.4.4...v5.4.5) (2025-06-29)


### Bug Fixes

* Bumped deps to trigger release flow (reverted ZMS-217) ([51fa651](https://github.com/zone-eu/mailsplit/commit/51fa6510e86b04c21700a1c214a4ba7e1885b001))

## [5.4.4](https://github.com/zone-eu/mailsplit/compare/v5.4.3...v5.4.4) (2025-06-26)


### Bug Fixes

* Bumped deps ([ed5a731](https://github.com/zone-eu/mailsplit/commit/ed5a73193c8bb69ee3a86bb85c4b7b8122a5c4f2))
* **message-splitter:** ZMS-217 Fix message-splitter trailing line breaks being incorrectly broken into separate lines ([#31](https://github.com/zone-eu/mailsplit/issues/31)) ([16eb658](https://github.com/zone-eu/mailsplit/commit/16eb6588419969ac3835cc4ae856e745cc97d2b7))
* ZMS-217 test message-splitter if fed 2 byte chunks of message data ([#28](https://github.com/zone-eu/mailsplit/issues/28)) ([ab22adb](https://github.com/zone-eu/mailsplit/commit/ab22adb988de2882de02a76e5be331daada532f1))

## [5.4.3](https://github.com/zone-eu/mailsplit/compare/v5.4.2...v5.4.3) (2025-02-28)


### Bug Fixes

* **update-package.json:** Update package.json ZMS-180 ([#26](https://github.com/zone-eu/mailsplit/issues/26)) ([475de94](https://github.com/zone-eu/mailsplit/commit/475de94663bd618bc3e350305ca4e94ddebcb38a))

## [5.4.2](https://github.com/andris9/mailsplit/compare/v5.4.1...v5.4.2) (2024-11-29)


### Bug Fixes

* **deploy:** Added missing package lock ([bc380db](https://github.com/andris9/mailsplit/commit/bc380db7ea740c2373698894b5e1d3dd155da134))

## [5.4.1](https://github.com/andris9/mailsplit/compare/v5.4.0...v5.4.1) (2024-11-29)


### Bug Fixes

* **deps:** Bumped deps ([5bfb15d](https://github.com/andris9/mailsplit/commit/5bfb15d3c606e84c84bf73831d6ef458160b962e))
