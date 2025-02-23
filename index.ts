/** Lookup is shared between the receiver and the sender, and it's only use is for objects' keys.
When both the receiver and the sender share the lookup, we don't need to send the object key as a string.
Rather we can point out that both the receiver and the sender share it,
so instead of a string, we put a number which corresponds to the lookup. This saves a lot of space.
*/
type Lookup = string[];

export type OABDATA = number | string | OABDATA[] | { [key: string]: OABDATA } | boolean | null;

const convBuff = new ArrayBuffer(4); // Buffer we use to convert to and from floats and unsigned 32 bit integers.
const f32 = new Float32Array(convBuff);
const u32 = new Uint32Array(convBuff);

/**
 * For reading data from incoming packets
 */
export class Reader {
    /** The index of the reader */
    private _at: number;

    /** The reader's buffer */
    private buffer: Uint8Array;

    /** The lookup */
    private lookup: Lookup;

    constructor(content: Uint8Array, options?: {
        lookup?: Lookup
    }) {
        this._at = 0;
        this.buffer = content;
        this.lookup = options?.lookup ?? [];
    }

    /** The index of the reader */
    public set at(val: number) {
        this._at = val;
        if (this._at > this.buffer.length) throw new Error(`Tried setting .at out of bounds! ${this._at}`);
    }

    public get at(): number {
        return this._at;
    }

    /** Unsigned 8 bit integer */
    public byte(): number {
        return this.buffer[this.at++];
    }

    /** LEB128, variable length decoding of an unsigned integer */
    public vu(): number {
        let out = 0;
        let shift = 0;

        do {
            out |= (this.buffer[this.at] & 127) << shift;
            shift += 7;
        } while (this.buffer[this.at++] & 128);

        return out;
    }

    /** Variable length decoding of a signed integer */
    public vi(): number {
        const data = this.vu();
        return data & 1 ? ~(data >> 1) : (data >> 1);
    }

    /** String with its length stored in the front */
    public string(): string {
        const strLen = this.vu();
        let final = "";
        for (let i = 0; i < strLen; i++) {
            final += String.fromCharCode(this.vu());
        }
        return final;
    }

    /** Integers/Floats as 32 bit numbers */
    public float(): number {
        u32[0] = this.vu();
        return f32[0];
    }

    /** Retrieves stuff like objects, arrays, and can even do it recursively */
    public data(): OABDATA { // Further explained in the Writer
        const byte = this.buffer[this.at++];
        switch (byte) {
            case 1: // Positive numbers
                {
                    return this.vu();
                }
            case 2: // Negative numbers
                {
                    return -this.vu();
                }
            case 3: // Floats
                {
                    return this.float();
                }
            case 4: // True
                {
                    return true;
                }
            case 5: // False
                {
                    return false;
                }
            case 6: // Array
                {
                    const arr: OABDATA = [];
                    while (this.buffer[this.at]) {
                        arr.push(this.data());
                    }
                    this.at++;
                    return arr;
                }
            case 7: // Any object
                {
                    const final: {
                        [key: string]: OABDATA
                    } = {};
                    while (this.buffer[this.at]) {
                        const byte = this.buffer[this.at++];
                        let key: string;
                        switch (byte) {
                            case 1: {
                                key = this.string();
                                break;
                            }
                            case 2: {
                                key = this.lookup[this.vu()];
                                if (key === undefined) { // Something has gone terribly wrong.
                                    throw new Error(`Reader.getData's object key string looked up a value out of bounds!`);
                                }
                                break;
                            }
                            default: {
                                throw new Error(`Unknown byte ${byte} in decoding an object.`);
                            }
                        }
                        final[key] = this.data();
                    }
                    this.at++;
                    return final;
                }
            case 8: // Null
                {
                    return null;
                }
            case 9: // Length-based string
                {
                    return this.string();
                }
            default: // Something has gone terribly wrong.
                {
                    throw new Error(`Unexpected index! Got ${byte}`);
                }
        }
    }

    /** Get the rest of the reader data after this.at.
     * 
     * Uses `Uint8Array.prototype.subarray`.
    */
    public rest(): Uint8Array {
        return this.buffer.subarray(this.at, this.buffer.length);
    }
}

/** For writing data to outgoing packets */
export class Writer {
    /** The buffer itself */
    private buffer: number[];

    /** The lookup */
    private lookup: Lookup;

    /** Whether to console.warn when a lookup isn't found */
    public warnIfNoLookup: boolean;

    constructor(options?: {
        lookup?: Lookup,
        warnIfNoLookup?: boolean
    }) {
        this.buffer = [];
        this.lookup = options?.lookup ?? [];
        this.warnIfNoLookup = options?.warnIfNoLookup ?? false;
    }

    /** Stores a single byte. */
    public byte(num: number) {
        this.buffer.push(num & 255);
        return this;
    }

    /** LEB128, variable length encoding of an unsigned integer. Stores 7 bits of a number at a time,
     * and uses the 8th bit to tell the reader to continue reading.
     * Attempting to store a negative integer will throw an error.
     */
    public vu(num: number) {
        if (num < 0) throw new Error(`Cannot store negative integers with vu! ${num}`);

        do {
            let part = num & 0b01111111;
            num >>>= 7;
            if (num) part |= 0b10000000;
            this.byte(part);
        } while (num);

        return this;
    }

    /** Variable length encoding of a signed integer
     *  
     * Stores the sign in a single bit.
     */
    public vi(num: number) {
        return this.vu(num < 0 ? ~num << 1 | 1 : num << 1);
    }

    /** Stores the length of the string instead of putting a null byte at the end,
     * since the string with null termination obviously can't store null characters
     */
    public string(str: string) {
        this.vu(str.length);
        for (let i = 0; i < str.length; i++) {
            this.vu(str.charCodeAt(i)); // Store the charcodes in vu form, since some charcodes are above 255 (which is the max limit for byte)
        }
        return this;
    }

    /** Stores an integer/float as a 32 bit number */
    public float(num: number) {
        f32[0] = num;
        return this.vu(u32[0]);
    }

    /** Stores stuff like objects, arrays, and can even do it recursively */
    public data(val: OABDATA) {
        switch (typeof val) {
            case "number": // Any number
                {
                    if (Number.isFinite(val)) { // Integer/Float
                        if (Number.isInteger(val)) {
                            if (val >= 0) {
                                this.byte(1).vu(val); // Positive int
                            } else {
                                this.byte(2).vu(-val); // Negative int
                            }
                        } else {
                            this.byte(3).float(val); // Float
                        }
                    } else {
                        throw new Error(`Cannot store ${val}!`);
                    }
                    break;
                }
            case "boolean": // Boolean
                {
                    this.byte(
                        val ?
                            4 : // True
                            5 // False
                    );
                    break;
                }
            case "object": // Any object
                {
                    if (Array.isArray(val)) { // Array
                        this.byte(6);

                        for (let i = 0; i < val.length; i++) {
                            this.data(val[i]);
                        }

                        this.byte(0); // Null terminator
                    } else if (val !== null) {  // Any type of object other than null
                        this.byte(7);

                        for (const [key, value] of Object.entries(val)) {
                            const tableEnc = this.lookup.indexOf(key);

                            if (tableEnc === -1) { // Not found key
                                this.byte(1).string(key); // Store it as a string
                                if (this.warnIfNoLookup) console.warn(`A key wasn't in the lookup table! ${value}.`);
                            } else { // Key found
                                this.byte(2).vu(tableEnc); // Store the index
                            }

                            this.data(value); // Store the value
                        }

                        this.byte(0); // Null terminator
                    } else {
                        this.byte(8); // Null is an object
                    }
                    break;
                }
            case "string": // String
                {
                    this.byte(9).string(val);
                    break;
                }
            default: // If none of these criteria are met, throw an error
                {
                    throw new Error(`Unknown data type! ${typeof (val)}`);
                }
        }
        return this;
    }

    /** Get a Uint8Array of everything you wrote. */
    public out(): Uint8Array {
        return new Uint8Array(this.buffer);
    }
}
