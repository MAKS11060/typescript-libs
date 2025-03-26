#!/usr/bin/env -S deno run -A --env-file --watch

import {expect} from 'jsr:@std/expect'
import {o} from './json-schema-builder.ts'

// const arr = o.array(o.string()).min(1).max(3)
// console.log(arr)
// console.log(arr.toSchema())
const arr = o.array(o.string())
console.log(arr.min(1))

Deno.test('SchemaGenerator Tests', async (t) => {
  await t.step('User Schema with Required and Optional Fields', () => {
    const userSchema = o.object({
      id: o.number(),
      username: o.string().min(2).max(32),
      nickname: o.string().optional(),
    })

    expect(userSchema.toSchema()).toEqual({
      type: 'object',
      properties: {
        id: {type: 'number'},
        username: {type: 'string', minLength: 2, maxLength: 32},
        nickname: {type: 'string'},
      },
      required: ['id', 'username'],
    })
  })

  await t.step('Array Schema', () => {
    const userSchema = o.object({
      id: o.number(),
      username: o.string().min(2).max(32),
    })

    const usersSchema = o.array(userSchema)

    expect(usersSchema.toSchema()).toEqual({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {type: 'number'},
          username: {type: 'string', minLength: 2, maxLength: 32},
        },
        required: ['id', 'username'],
      },
    })
  })

  await t.step('Account Schema with Nested Object', () => {
    const userSchema = o.object({
      id: o.number(),
      username: o.string().min(2).max(32),
      nickname: o.string().optional(),
    })

    const accountSchema = o
      .object({
        owner: userSchema,
        createdAt: o.number(),
      })
      .toSchema()

    expect(accountSchema).toEqual({
      type: 'object',
      properties: {
        owner: {
          type: 'object',
          properties: {
            id: {type: 'number'},
            username: {type: 'string', minLength: 2, maxLength: 32},
            nickname: {type: 'string'},
          },
          required: ['id', 'username'],
        },
        createdAt: {type: 'number'},
      },
      required: ['owner', 'createdAt'],
    })
  })

  await t.step('Immutable Schema State', () => {
    const idSchema = o.number()
    const userSchema = o.object({
      id: idSchema.optional(),
    })

    expect(idSchema.isRequiredField()).toBe(true)
  })
})
