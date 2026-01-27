# Dev

### CLI Tools

#### `install`

```ps
deno run -A jsr:@maks11060/dev/install
```

Run `deno` with arguments, before creating `package.json`

```ps
deno run -A jsr:@maks11060/dev/install -- add jsr:@std/fs
```

> What does the `install` command do?

This will **install** the **jsr** packages in `node_modules` and copy all the
[`subpaths`](https://docs.deno.com/runtime/fundamentals/configuration/#custom-path-mappings) needed for libraries like
**`svelte`**

Create `package.json` with:

- copy dependencies from `deno.json[c]`
- copy subpath [imports](https://nodejs.org/api/packages.html#imports)
- create `.npmrc` with `@jsr:registry=https://npm.jsr.io`

```jsonc
// deno.jsonc
{
  "imports": {
    "@std/path": "jsr:@std/path@^1.1.4",
    "zod": "npm:zod@^4.3.6",
    // alias
    "#/routes/": "./src/routes/"
  }
}
```

Result

```json
// package.json
{
  "type": "module",
  "dependencies": {
    "zod": "npm:zod@^4.3.6",
    "@std/path": "npm:@jsr/std__path@^1.1.4"
  },
  "imports": {
    "#/routes/": "./src/routes/"
  }
}
```
