#!/usr/bin/env -S deno run -A

import {build, emptyDir} from '@deno/dnt'
import {deepMerge} from 'jsr:@std/collections/deep-merge'
import {readDenoJson} from './dev/types.ts'

const pkgs = [
  // {
  //   entry: './hono',
  //   name: '@maks11060/hono',
  //   description: '',
  // },
  // {
  //   entry: './openapi',
  //   name: '@maks11060/openapi',
  //   description: '',
  // },
  // {
  //   entry: './web',
  //   name: '@maks11060/web',
  //   description: '',
  // },
  // {
  //   entry: './webauthn',
  //   name: '@maks11060/webauthn',
  //   description: '',
  // },
]

await emptyDir(`npm`)
for (const {entry, name, description} of pkgs) {
  const denoJson = readDenoJson(`${entry}/deno.jsonc`)

  await build({
    entryPoints: [`${entry}/mod.ts`],
    // outDir: `${entry}/npm`,
    outDir: `npm/${entry}`,
    shims: {
      deno: true,
    },

    test: false,
    typeCheck: false,
    // declaration: false,
    scriptModule: false,
    packageManager: 'bun',
    skipNpmInstall: true,

    package: {
      name,
      version: denoJson.version!,
      description,
      license: 'MIT',
      repository: {
        type: 'git',
        url: 'git+https://github.com/MAKS11060/typescript-libs.git',
      },
      bugs: {
        url: 'https://github.com/MAKS11060/typescript-libs/issues',
      },
      devDependencies: {
        '@types/node': '*',
      },
    },

    postBuild() {
      Deno.copyFileSync('LICENSE', `npm/${entry}/LICENSE`)
    },
  })
}

for (const {entry} of pkgs) {
  const packageJsonFile = `npm/${entry}/package.json`
  const packageJson = JSON.parse(Deno.readTextFileSync(packageJsonFile))
  delete packageJson['_generatedBy']
  const pkg = deepMerge(packageJson, {
    type: 'module',
  })

  Deno.writeTextFileSync(packageJsonFile, JSON.stringify(pkg, null, 2))
}
