import {signature_from_image} from '@maks11060/iqdb-hash'
import {test} from 'node:test'

test('Test 196857', async (t) => {
  const res = await fetch('https://cdn.donmai.us/original/7b/7e/7b7e47480b5d12625ee52a0aa3b91867.jpg')

  const sig = signature_from_image(await res.bytes())

  console.log(`https://danbooru.donmai.us/iqdb_queries?search[hash]=${sig.toString()}`)
})
