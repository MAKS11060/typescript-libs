// @generated file from wasmbuild -- do not edit
// @ts-nocheck: generated
// deno-lint-ignore-file
// deno-fmt-ignore-file

let wasm
export function __wbg_set_wasm(val) {
  wasm = val
}

let cachedUint8ArrayMemory0 = null

function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer)
  }
  return cachedUint8ArrayMemory0
}

const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder

let cachedTextDecoder = new lTextDecoder('utf-8', {ignoreBOM: true, fatal: true})

cachedTextDecoder.decode()

const MAX_SAFARI_DECODE_BYTES = 2146435072
let numBytesDecoded = 0
function decodeText(ptr, len) {
  numBytesDecoded += len
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder = new lTextDecoder('utf-8', {ignoreBOM: true, fatal: true})
    cachedTextDecoder.decode()
    numBytesDecoded = len
  }
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len))
}

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0
  return decodeText(ptr, len)
}

let WASM_VECTOR_LEN = 0

function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0
  getUint8ArrayMemory0().set(arg, ptr / 1)
  WASM_VECTOR_LEN = arg.length
  return ptr
}

function takeFromExternrefTable0(idx) {
  const value = wasm.__wbindgen_export_0.get(idx)
  wasm.__externref_table_dealloc(idx)
  return value
}
/**
 * @param {Uint8Array} data
 * @returns {JsSignature}
 */
export function signature_from_image(data) {
  const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc)
  const len0 = WASM_VECTOR_LEN
  const ret = wasm.signature_from_image(ptr0, len0)
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1])
  }
  return JsSignature.__wrap(ret[0])
}

const lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder

const cachedTextEncoder = new lTextEncoder('utf-8')

const encodeString = typeof cachedTextEncoder.encodeInto === 'function'
  ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view)
  }
  : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg)
    view.set(buf)
    return {
      read: arg.length,
      written: buf.length,
    }
  }

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg)
    const ptr = malloc(buf.length, 1) >>> 0
    getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf)
    WASM_VECTOR_LEN = buf.length
    return ptr
  }

  let len = arg.length
  let ptr = malloc(len, 1) >>> 0

  const mem = getUint8ArrayMemory0()

  let offset = 0

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset)
    if (code > 0x7F) break
    mem[ptr + offset] = code
  }

  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset)
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len)
    const ret = encodeString(arg, view)

    offset += ret.written
    ptr = realloc(ptr, len, offset, 1) >>> 0
  }

  WASM_VECTOR_LEN = offset
  return ptr
}
/**
 * @param {string} data
 * @returns {JsSignature}
 */
export function signature_from_hash(data) {
  const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc)
  const len0 = WASM_VECTOR_LEN
  const ret = wasm.signature_from_hash(ptr0, len0)
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1])
  }
  return JsSignature.__wrap(ret[0])
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len)
}
/**
 * @param {Uint8Array} data
 * @returns {Uint8Array}
 */
export function resize_image(data) {
  const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc)
  const len0 = WASM_VECTOR_LEN
  const ret = wasm.resize_image(ptr0, len0)
  if (ret[3]) {
    throw takeFromExternrefTable0(ret[2])
  }
  var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice()
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1)
  return v2
}

/**
 * Chroma subsampling format
 * @enum {0 | 1 | 2 | 3}
 */
export const ChromaSampling = Object.freeze({
  /**
   * Both vertically and horizontally subsampled.
   */
  Cs420: 0,
  '0': 'Cs420',
  /**
   * Horizontally subsampled.
   */
  Cs422: 1,
  '1': 'Cs422',
  /**
   * Not subsampled.
   */
  Cs444: 2,
  '2': 'Cs444',
  /**
   * Monochrome.
   */
  Cs400: 3,
  '3': 'Cs400',
})

const JsSignatureFinalization = (typeof FinalizationRegistry === 'undefined')
  ? {register: () => {}, unregister: () => {}}
  : new FinalizationRegistry((ptr) => wasm.__wbg_jssignature_free(ptr >>> 0, 1))

export class JsSignature {
  static __wrap(ptr) {
    ptr = ptr >>> 0
    const obj = Object.create(JsSignature.prototype)
    obj.__wbg_ptr = ptr
    JsSignatureFinalization.register(obj, obj.__wbg_ptr, obj)
    return obj
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr
    this.__wbg_ptr = 0
    JsSignatureFinalization.unregister(this)
    return ptr
  }

  free() {
    const ptr = this.__destroy_into_raw()
    wasm.__wbg_jssignature_free(ptr, 0)
  }
  /**
   * @returns {Array<any>}
   */
  get avgl() {
    const ret = wasm.jssignature_avgl(this.__wbg_ptr)
    return ret
  }
  /**
   * @returns {Array<any>}
   */
  get sig() {
    const ret = wasm.jssignature_sig(this.__wbg_ptr)
    return ret
  }
  /**
   * @returns {string}
   */
  toString() {
    let deferred1_0
    let deferred1_1
    try {
      const ret = wasm.jssignature_toString(this.__wbg_ptr)
      deferred1_0 = ret[0]
      deferred1_1 = ret[1]
      return getStringFromWasm0(ret[0], ret[1])
    } finally {
      wasm.__wbindgen_free(deferred1_0, deferred1_1, 1)
    }
  }
}

export function __wbg_new_d8a154d0939e6bb4() {
  const ret = new Array()
  return ret
}

export function __wbg_push_a625ffb414ba40f2(arg0, arg1) {
  const ret = arg0.push(arg1)
  return ret
}

export function __wbg_wbindgenthrow_681185b504fabc8e(arg0, arg1) {
  throw new Error(getStringFromWasm0(arg0, arg1))
}

export function __wbindgen_cast_2241b6af4c4b2941(arg0, arg1) {
  // Cast intrinsic for `Ref(String) -> Externref`.
  const ret = getStringFromWasm0(arg0, arg1)
  return ret
}

export function __wbindgen_cast_d6cd19b81560fd6e(arg0) {
  // Cast intrinsic for `F64 -> Externref`.
  const ret = arg0
  return ret
}

export function __wbindgen_init_externref_table() {
  const table = wasm.__wbindgen_export_0
  const offset = table.grow(4)
  table.set(0, undefined)
  table.set(offset + 0, undefined)
  table.set(offset + 1, null)
  table.set(offset + 2, true)
  table.set(offset + 3, false)
}
