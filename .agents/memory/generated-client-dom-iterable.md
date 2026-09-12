---
name: Generated client DOM iterable support
description: TypeScript compiler support needed by generated API client request helpers.
---

Generated API client code can use `Headers.entries()`, which requires `dom.iterable` in the API client package's TypeScript `lib` list.

**Why:** The generated client may compile successfully through codegen but fail the workspace library typecheck when iterable DOM types are missing.

**How to apply:** Keep `dom.iterable` alongside `dom` whenever the generated client transport uses iterable browser APIs.