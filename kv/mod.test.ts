import { kvModel } from '@maks11060/kv'
import { z } from 'zod/v4'

Deno.test('Test 594775', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const userSchema = z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().nullish().default(null),
    age: z.int().positive(),
  })

  const userModel = kvModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: 'uuid7',
    index: {
      username: {
        key: (v) => v.username,
      },
      email: {
        key: (v) => v.email,
      },
      age: {
        relation: 'many',
        key: (v) => v.age,
      },
    },
  })

  const user1 = await userModel.create({username: 'user1', age: 18})
  user1 // { id: "0197d2e1-9379-7d5f-a7d2-e2dcc8b4ac9d", username: "user1", email: null, age: 18 }

  const userId = await userModel.findByIndex('username', 'user1', {resolve: true})
  userId // "0197d2e1-9379-7d5f-a7d2-e2dcc8b4ac9d"

  const user = await userModel.findByIndex('username', 'user1', {resolve: true})
  user // { id: "0197d2e1-9379-7d5f-a7d2-e2dcc8b4ac9d", username: "user1", email: null, age: 18 }
})
