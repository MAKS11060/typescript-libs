#!/usr/bin/env -S deno run -A

import {parseArgs} from '@std/cli/parse-args'
import {existsSync} from '@std/fs'
import {parse} from '@std/jsonc/parse'

const args = parseArgs(Deno.args, {
  boolean: ['verbose'],
  string: ['config'],
  alias: {
    v: 'verbose',
    c: 'config',
  },
  '--': true,
})

interface PackageJson {
  type?: 'commonjs' | 'module'
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  imports?: Record<string, string>
}

interface DenoConfig {
  imports?: Record<string, string>
}

const createPackageJson = (packageJson: PackageJson) => {
  Deno.writeTextFileSync('./package.json', JSON.stringify(packageJson, null, 2) + '\n')
}

const readDenoJson = (path?: string) => {
  if (!path) {
    if (existsSync('./deno.jsonc')) path = './deno.jsonc'
    else if (existsSync('./deno.json')) path = './deno.json'
    else throw new Error('Not Found deno.json[c] file')
  }

  if (args.verbose) console.log('load config', path)
  const data = Deno.readTextFileSync(path)
  return parse(data) as DenoConfig
}

const createNpmRc = () => {
  const jsrRegistry = '@jsr:registry=https://npm.jsr.io'
  if (!existsSync('./.npmrc')) {
    Deno.writeTextFileSync('.npmrc', jsrRegistry)
  } else {
    let data = Deno.readTextFileSync('.npmrc')
    if (!data.includes(jsrRegistry)) {
      data += '\n'
      data += jsrRegistry
      Deno.writeTextFileSync('.npmrc', data.trim())
    }
  }
}

const parseDenoImports = (imports?: Record<string, string>) => {
  const result = {
    jsr: [] as [key: string, specifier: string][],
    npm: [] as [key: string, specifier: string][],
    alias: [] as [key: string, path: string][],
  }

  if (!imports) return result

  for (const [key, value] of Object.entries(imports)) {
    if (value.startsWith('jsr:')) {
      result.jsr.push([key, value])
    } else if (value.startsWith('npm:')) {
      result.npm.push([key, value])
    } else { // alias paths
      result.alias.push([key, value])
    }
  }

  return result
}

const jsrToNpmSpecifier = (jsr: ReturnType<typeof parseDenoImports>['jsr']) => {
  return jsr
    .filter(([, target]) => target.startsWith(`jsr:`))
    .map(([dep, target]) => {
      const pkg = target
        .slice('jsr:@'.length)
        .split('/')

      return [dep, 'npm:@jsr/' + pkg.join('__')] as [key: string, specifier: string]
    })
}

if (import.meta.main) {
  if (existsSync('./package.json')) {
    await Deno.remove('./package.json') // remove package.json
  }

  // run deno with: './install.ts -- add npm:hono'
  if (args['--'].length > 1) {
    const proc = new Deno.Command(Deno.execPath(), {
      args: args['--'],
      stdout: 'inherit',
      stderr: 'inherit',
    }).outputSync()
    if (!proc.success) Deno.exit(1)
  }

  const imports = parseDenoImports(readDenoJson(args.config).imports)
  if (args.verbose) console.log('deno.json imports', imports)

  createNpmRc() // create .npmrc
  createPackageJson({
    type: 'module',
    dependencies: {
      ...Object.fromEntries(imports.npm),
      ...Object.fromEntries(jsrToNpmSpecifier(imports.jsr)),
    },
    imports: Object.fromEntries(imports.alias),
  })

  // install
  const proc = new Deno.Command(Deno.execPath(), {
    args: ['install'],
    stdout: 'inherit',
    stderr: 'inherit',
  }).outputSync()

  if (!proc.success) Deno.exit(1)
}
