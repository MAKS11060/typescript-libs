import {existsSync} from '@std/fs/exists'
import {parse} from '@std/jsonc/parse'

const DenoConfigs = [
  'deno.json',
  'deno.jsonc',
]

export interface PackageJson {
  type?: 'commonjs' | 'module'
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  imports?: Record<string, string>
  exports?: Record<string, string>
}

export interface DenoConfig {
  name?: string
  version?: string
  imports?: Record<string, string>
  exports?: Record<string, string>
}

const checkExists = (files: (string | undefined)[]) => {
  for (const file of files) {
    if (file && existsSync(file)) return file
  }
  throw new Error(`File not exists: ${files[0] || ''}`)
}

export const createPackageJson = (packageJson: PackageJson) => {
  Deno.writeTextFileSync('./package.json', JSON.stringify(packageJson, null, 2) + '\n')
}

export const readPackageJson = async (path: string = './package.json') => {
  path ??= checkExists([path])
  try {
    return JSON.parse(await Deno.readTextFile(path)) as PackageJson
  } catch (e) {
    throw new SyntaxError('Parse package.json', {cause: e})
  }
}

export const readDenoJson = (path?: string) => {
  path ??= checkExists([path, ...DenoConfigs])

  const data = Deno.readTextFileSync(path)
  return parse(data) as DenoConfig
}

export const createNpmRc = () => {
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

export const parseDenoImports = (imports?: Record<string, string>) => {
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

export const jsrToNpmSpecifier = (jsr: ReturnType<typeof parseDenoImports>['jsr']) => {
  return jsr
    .filter(([, target]) => target.startsWith(`jsr:`))
    .map(([dep, target]) => {
      const pkg = target
        .slice('jsr:@'.length)
        .split('/')

      return [dep, 'npm:@jsr/' + pkg.join('__')] as [key: string, specifier: string]
    })
}
