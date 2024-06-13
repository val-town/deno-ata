# ATA

This was originally based on [Automatic Type Acquisition](https://github.com/microsoft/TypeScript-Website/tree/v2/packages/ata), a subproject
of TypeScript-Website, which powers the TypeScript Playground. What ATA
does is it loads TypeScript types from jsDelivr and figures out `@types/` packages
for imported NPM modules.

When someone types

```ts
import chalk from "npm:chalk";
```

We want to provide them with nice types. That's the intent here.

## Differences from ATA

This is now dramatically different from ATA because Deno is dramatically
different from Node. Here are some of the differences:

- Deno relies heavily on URL (HTTP) imports. TypeScript does not support them at all:
  <https://github.com/microsoft/TypeScript/issues/35749>
- Deno references NPM modules using a `npm:` prefix. TypeScript does not support
  that at all. It also supports a `jsr:` prefix for JSR imports. TypeScript does not
  support that at all.
- Deno requires Node modules be imported using the `node:` prefix. TypeScript does
  not make it easy to add that requirement.

Supporting URL imports, the `npm:` and `jsr:` prefixes, the required `node:` prefix,
is very difficult.

## Alternative paths

Deno has a [Deno Language Server](https://github.com/denoland/deno/tree/main/cli/lsp)
which implements all of its workarounds. Unfortunately, it's both written in Rust
and relies on Deno itself. Using it on the frontend would be a total nonstarter - even
if we were to compile it to WASM, it would be tens of megabytes.

We could run the Deno LSP on a server. This would require us to manage a lot of
extra, sandboxed servers.

## Workflow

Reflects reality on June 13, 2024.

```mermaid
flowchart TD
    RECEIVED_FILE
    ANALYZE_IMPORTS
    RECEIVED_FILE --> ANALYZE_IMPORTS
    ANALYZE_IMPORTS --> HAS_NODE_PREFIX
    HAS_NODE_PREFIX{"has node: prefix"} --> TRIGGER_LOADING_NPM_TYPES
    TRIGGER_LOADING_NPM_TYPES --> FETCH_URL[loadDependency]
    ANALYZE_IMPORTS --> HAS_NPM_PREFIX{"has npm: prefix"}
    ANALYZE_IMPORTS --> HAS_JSR_PREFIX{"has jsr: prefix"}
    ANALYZE_IMPORTS --> IS_ABSOLUTE_HTTPS_URL{"is absolute url"}
    ANALYZE_IMPORTS --> IS_RELATIVE_URL{"is relative url"}
    IS_RELATIVE_URL{"is relative url"} --> RESOLVE_TO_ABSOLUTE_URL
    RESOLVE_TO_ABSOLUTE_URL --> FETCH_URL
    HAS_NPM_PREFIX --> REWRITE_TO_ESM
    HAS_JSR_PREFIX --> REWRITE_TO_ESM
    IS_ABSOLUTE_HTTPS_URL{"is absolute https url"} --> FETCH_URL
    REWRITE_TO_ESM --> FETCH_URL
    FETCH_URL --> IS_VAL_URL
    IS_VAL_URL{"is val url"} --> FETCH_WITH_BEARER_TOKEN
    FETCH_URL --> IS_SKYPACK_URL
    IS_SKYPACK_URL{"is skypack url"} --> ADD_DTS_SUFFIX
    FETCH_URL --> FETCH
    ADD_DTS_SUFFIX --> FETCH
    FETCH --> HAS_X_TYPESCRIPT_TYPES_HEADER{"has x-typescript-types header"}
    HAS_X_TYPESCRIPT_TYPES_HEADER -->|Fetch types| FETCH
    FETCH --> IS_TYPES_NODE
    IS_TYPES_NODE{"is types node"} --> FIX_PROCESS_AND_BUFFER_GLOBALS
    FIX_PROCESS_AND_BUFFER_GLOBALS --> CREATE_FILE_WITH_FINAL_PATH
    FETCH --> CREATE_FILE_WITH_FINAL_PATH
    CREATE_FILE_WITH_FINAL_PATH --> WAS_REDIRECTED{"was redirected"}
    WAS_REDIRECTED --> CREATE_REDIRECT_FILE
    CREATE_REDIRECT_FILE --> DONE
    CREATE_FILE_WITH_FINAL_PATH --> DONE
    DONE --> RECEIVED_FILE
```
