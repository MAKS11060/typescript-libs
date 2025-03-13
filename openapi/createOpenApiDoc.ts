import {OperationObject, PathItemObject} from "npm:openapi3-ts"
import {CreateOpenApiDoc, openapi} from "./openapi2.ts"


export const createOpenApiDoc = <Doc extends CreateOpenApiDoc>(doc: Doc) => {
  type TagKeys = keyof Doc['tags'];

  const addPath = (path: string, options?: { tags: TagKeys | TagKeys[]; }) => {
    const el = {} as PathItemObject;

    openapi.paths ??= {};
    openapi.paths[path] = el;

    const describe = (obj: { description: string; }, description: string) => {
      obj.description = description;
    };
    const summary = (obj: { summary: string; }, summary: string) => {
      obj.summary = summary;
    };

    type MethodOptions = {
      describe: (description: string) => void;
      summary: (summary: string) => void;
    };

    const methodHandler = {
      // describe: describe.bind(),
    };

    const handler = {
      // describe: (description: string) => {
      // el.description = description
      // return self
      // },
      // summary: (summary: string) => {
      //   el.summary = summary
      //   return self
      // },
      get: (methodHandler: (t: MethodOptions) => void) => {
        const method: OperationObject = {};

        methodHandler({
          describe: describe.bind(method),
        });
        return handler;
      },
    };

    return handler;
  };

  return { addPath };
};
