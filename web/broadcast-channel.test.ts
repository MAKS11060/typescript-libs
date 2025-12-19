import {BroadcastChannelTyped} from './broadcast-channel.ts'

type BcType =
  | {type: 'req'}
  | {type: 'res'; value: number}

const bc1 = new BroadcastChannelTyped<BcType>('test-bc-1')
const bc2 = new BroadcastChannelTyped<BcType>('test-bc-1')

Deno.test('Test 155848', async (t) => {
  bc1.onmessage = (e) => {
    // console.log(e)
    switch (e.data.type) {
      case 'req':
        bc2.postMessage({type: 'res', value: Date.now()})
        break
      case 'res':
        console.log(`${e.data.type}: ${e.data.value}`)
        break
    }
  }

  bc2.addEventListener('message', (e) => {
    // console.log(e)
    // if (e.data.type === 'req')
    switch (e.data.type) {
      case 'req':
        bc1.postMessage({type: 'res', value: Date.now()})
        break
      case 'res':
        console.log(`${e.data.type}: ${e.data.value}`)
        break
    }
  })

  bc2.postMessage({type: 'req'})
  bc1.postMessage({type: 'req'})
})
