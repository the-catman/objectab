// A file for testing edge cases

import { Reader, Writer, OABDATA, Lookup } from "./index.ts"

let data = new Uint8Array([6, 2, 9, 4, 69, 70, 80, 51, 9, 0]);

let reader = new Reader(data);

console.log(Object.keys(reader));