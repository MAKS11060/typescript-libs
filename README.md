# Deno-libs

## How to import
`https://raw.githubusercontent.com/MAKS11060/deno-libs/main/:pathToModule`

### printBuf
```ts
import {printBuf} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/debug/mod.ts'

printBuf(crypto.getRandomValues(new Uint8Array(40)))

//       40 00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15
// 00000000 b3 45 cf 2b 90 b3 97 15 79 05 d3 36 d9 bd 3f b7
// 00000010 18 1e ff 65 d5 b8 04 4d 72 1b 51 94 3d 78 7b 6b
// 00000020 cd 5a b3 2b 47 59 53 e6
```

### generateKeyPair
```ts
import {generateKeyPair} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/crypto/keys.ts'

console.log(await generateKeyPair('Ed25519'))
```
