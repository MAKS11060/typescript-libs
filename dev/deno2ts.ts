#!/usr/bin/env -S deno run -A

import {parseArgs} from '@std/cli/parse-args'
import {deepMerge} from '@std/collections/deep-merge'
import {existsSync} from '@std/fs'
import {
  createNpmRc,
  createPackageJson,
  jsrToNpmSpecifier,
  type PackageJson,
  parseDenoImports,
  readDenoJson,
  readPackageJson,
} from './types.ts'

const args = parseArgs(Deno.args, {
  boolean: ['verbose'],
  string: ['config'],
  alias: {
    v: 'verbose',
    c: 'config',
  },
  '--': true,
})

if (import.meta.main) {
  const packageJson = await readPackageJson().catch(() => ({type: 'module'} satisfies PackageJson))
  if (existsSync('./package.json')) await Deno.remove('./package.json') // remove package.json

  // run deno with: './install.ts -- add npm:hono'
  if (args['--'].length > 1) {
    const proc = new Deno.Command(Deno.execPath(), {
      args: args['--'],
      stdout: 'inherit',
      stderr: 'inherit',
    }).outputSync()
    if (!proc.success) {
      createPackageJson(packageJson) // restore original package.json
      Deno.exit(proc.code)
    }
  }

  // parse, merge // TODO: make options 'merge' | 'override' for deps/imports
  const imports = parseDenoImports(readDenoJson(args.config).imports)
  const packageJsonRes = deepMerge(packageJson, {
    type: 'module',
    dependencies: {
      ...Object.fromEntries(imports.npm),
      ...Object.fromEntries(jsrToNpmSpecifier(imports.jsr)),
    },
    imports: Object.fromEntries(imports.alias),
  })

  if (args.verbose) console.log('deno.json imports', imports)
  createPackageJson(packageJsonRes as PackageJson)

  // install
  // createNpmRc() // create .npmrc

  // const proc = new Deno.Command(Deno.execPath(), {
  //   args: ['install'],
  //   stdout: 'inherit',
  //   stderr: 'inherit',
  // }).outputSync()

  // if (!proc.success) Deno.exit(proc.code)
}
