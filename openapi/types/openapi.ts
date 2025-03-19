


/* const createOpenApiDoc = () => {
  const _path_op = {
    response: () => {},
  }

  const _path = {
    get: (handler: (t: typeof _path_op) => void) => {
      handler()
      return _path
    },
  }

  const _doc = {
    path: (path) => {
      return _path
    },
  }
  return _doc
}

//
const doc = createOpenApiDoc()

doc
  .path('/api') //
  .get((t) => {
    t.response(200)
  })
 */