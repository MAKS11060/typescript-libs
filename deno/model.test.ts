import {z} from 'zod'
import {createModelSource} from './model.ts'
import {printKV} from './kvLib.ts'

const idMap = new Map<string, number>()
const smallID = (key: string, start = 0) => {
  idMap.set(key, (idMap.get(key) ?? start) + 1)
  return `${key}_` + idMap.get(key)
}

Deno.test('1', async (t) => {
  const kv = await Deno.openKv(':memory:')
  const factory = createModelSource(kv)

  const userSchema = z.object({
    id: z.string(),
    username: z.string(),
    nickname: z.string(),
    email: z.string().email(),
    age: z.number().default(18),
    info: z.object({
      test: z.boolean(),
    }),
  })

  const userModel = factory.model(userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => smallID('user'),
    index: {
      username: {
        relation: 'one',
        key: ({username}) => username.toLowerCase(),
      },
      email: {
        relation: 'one',
        key: ({email}) => {
          const [name, host] = email.split('@', 2)
          return [name, host.toLowerCase()].join('@')
        },
      },
      age: {
        relation: 'many',
        key: ({age}) => age,
      },
      info_test: {
        relation: 'many',
        key: ({info}) => info.test,
      },
    },
  })

  // C
  for (let i = 1; i < 3; i++) {
    await userModel.create({
      username: `user_${i}`,
      nickname: `nick_${i}`,
      email: `test@test${i}.com`,
      info: {
        test: true,
      },
    })
  }

  // await printKV(kv)

  // R
  // console.log(await userModel.find('user_1'))

  // R many
  // console.log(await userModel.findMany({}))

  // R by index
  // console.log(await userModel.findByIndex('age', 18, {}))
  // console.log(await userModel.findByIndex('info_test', '', {resolve: true}))

  // const usernameId = await userModel.findByIndex('username', 'user_1')
  // const ageIds = await userModel.findByIndex('age', 18)
  // console.log({usernameId, ageIds})

  const userId = await userModel.findByIndex('username', 'user_1')
  const usersIds = await userModel.findByIndex('age', 18)

  const user = await userModel.findByIndex('username', 'user_1', {resolve: true})
  const users = await userModel.findByIndex('age', 18, {resolve: true})
  console.log({userId, usersIds, user, users})

  // printKV(kv)
  kv.close()
})
