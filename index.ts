/** Lookup is shared between the receiver and the sender, and it's only use is for objects' keys.
When both the receiver and the sender share the lookup, we don't need to send the object key as a string.
Rather we can point out that both the receiver and the sender share it,
so instead of a string, we put a number which corresponds to the lookup. This saves a lot of space.
*/
export type Lookup = string[];

export type OABDATA = number | string | OABDATA[] | { [key: string]: OABDATA } | boolean | null;

/**
 * For reading data from incoming packets.
 */
export class Reader {
    /** The index of the reader. */
    public at: number;

    /** The reader's buffer. */
    private buffer: Uint8Array;

    /** The lookup. */
    private lookup: Lookup;

    /** Buffers we use to convert to and from floats and unsigned 32 bit integers. */
    private convBuff = new ArrayBuffer(4);
    private f32 = new Float32Array(this.convBuff);
    private u8 = new Uint8Array(this.convBuff);

    constructor(content: Uint8Array, options?: {
        lookup?: Lookup
    }) {
        this.at = 0;
        this.buffer = content;
        this.lookup = options?.lookup || [];
    }

    /** Check whether or not we went out of bounds. */
    public checkOOB() {
        if (this.at > this.buffer.length) throw new Error(`Tried setting .at out of bounds! ${this.at}`);
    }

    /** Unsigned 8 bit integer.
     * Unsafe: Does not check out of bounds. That must be done later in the code.
    */
    private byteUnsafe(): number {
        return this.buffer[this.at++];
    }

    /** Unsigned 8 bit integer. */
    public byte(): number {
        const val = this.buffer[this.at++];
        this.checkOOB();
        return val;
    }

    /** LEB128, variable length decoding of an unsigned integer. */
    public vu(): number {
        let out = 0;
        let shift = 0;

        do {
            out |= (this.buffer[this.at] & 127) << shift;
            shift += 7;
        } while (this.byteUnsafe() & 128);

        this.checkOOB();

        return out;
    }

    /** Variable length decoding of a signed integer. */
    public vi(): number {
        const data = this.vu();
        return data & 1 ? ~(data >> 1) : (data >> 1);
    }

    /** Decodes a single character stored as UTF-8.
     * 
     * The function returns the character point as a number, not the character itself.
     * 
     * Unsafe: Does not check out of bounds. That must be done later in the code.
     */
    private char_unsafe(): number {
        const byte1 = this.byteUnsafe();
        switch (true) {
            case (byte1 <= 0x7F): 
                return byte1;
    
            case ((byte1 & 0b11100000) === 0b11000000):
                return ((byte1 & 0b00011111) << 6) | (this.byteUnsafe() & 0b00111111);

            case ((byte1 & 0b11100000) === 0b11100000):
                return ((byte1 & 0b00001111) << 12) | ((this.byteUnsafe() & 0b00111111) << 6) |
                (this.byteUnsafe() & 0b00111111);

            case ((byte1 & 0b11110000) === 0b11110000):
                return ((byte1 & 0b00000111) << 18) | ((this.byteUnsafe() & 0b00111111) << 12) |
                    ((this.byteUnsafe() & 0b00111111) << 6) | (this.byteUnsafe() & 0b00111111);

            default:
                throw new Error("Error in decoding UTF-8: value out of bounds.");
        }
    }

    /** Retrieves a string with its length stored in the front. */
    public string(): string {
        const strLen = this.vu();
        let final = "";
        for (let i = 0; i < strLen; i++) {
            final += String.fromCodePoint(this.char_unsafe());
        }
        this.checkOOB();
        return final;
    }

    /** Retrieves integers/floats using 32 bit precision. */
    public float(): number {
        this.u8[0] = this.byteUnsafe();
        this.u8[1] = this.byteUnsafe();
        this.u8[2] = this.byteUnsafe();
        this.u8[3] = this.byteUnsafe();
        this.checkOOB();
        return this.f32[0];
    }

    /** Retrieves many values, and can even do it recursively. */
    public data(): OABDATA {
        const header = this.byteUnsafe();
        switch (header) {
            case 1: // Positive numbers
                return this.vu();

            case 2: // Negative numbers
                return -this.vu();

            case 3: // Floats
                return this.float();

            case 4: // True
                return true;

            case 5: // False
                return false;

            case 6: { // Array
                    const arr: OABDATA = [],
                    length = this.vu();
                    for(let i = 0; i < length; i++) {
                        arr.push(this.data());
                    }
                    return arr;
                }
            case 7: { // Any object
                    const final: {
                        [key: string]: OABDATA
                    } = {},
                    length = this.vu();
                    for(let i = 0; i < length; i++) {
                        let key: string;
                        const byte = this.byteUnsafe();
                        switch (byte) {
                            case 1:
                                key = this.string();
                                break;
                            case 2: {
                                    key = this.lookup[this.vu()];
                                    if (key === undefined) { // Something has gone terribly wrong.
                                        throw new Error(`Reader.getData's object key string looked up a value out of bounds!`);
                                    }
                                    break;
                                }
                            default:
                                throw new Error(`Unknown byte ${byte} in decoding an object.`);
                        }

                        final[key] = this.data();
                    }
                    return final;
                }

            case 8: // Null
                return null;

            case 9: // Length-based string
                return this.string();

            default: // Something has gone terribly wrong.
                throw new Error(`Unexpected index! Got ${header}`);
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

/** For writing data to outgoing packets. */
export class Writer {
    /** The buffer itself. */
    private buffer: number[];

    /** The lookup. */
    private lookup: Lookup;

    /** Whether to console.warn when a lookup isn't found. */
    public warnIfNoLookup: boolean;

    /** Buffer we use to convert to and from floats and unsigned 32 bit integers. */
    private convBuff = new ArrayBuffer(4);
    private f32 = new Float32Array(this.convBuff);
    private u8 = new Uint8Array(this.convBuff);

    constructor(options?: {
        lookup?: Lookup,
        warnIfNoLookup?: boolean
    }) {
        this.buffer = [];
        this.lookup = options?.lookup || [];
        this.warnIfNoLookup = options?.warnIfNoLookup ?? false;
    }

    /** Stores a single byte. */
    public byte(num: number) {
        this.buffer.push(num);
        return this;
    }

    /** LEB128, variable length encoding of an unsigned integer.
     * 
     * All integers will be cast to unsigned, then stored.
     */
    public vu(num: number) {
        num >>>= 0; // Cast to unsigned.

        do {
            let part = num & 0b01111111;
            num >>>= 7;
            if (num) part |= 0b10000000;
            this.byte(part);
        } while (num);

        return this;
    }

    /** Variable length encoding of a signed integer.
     *  
     * Stores the sign in a single bit.
     */
    public vi(num: number) {
        return this.vu(num < 0 ? (~num << 1 | 1) : (num << 1));
    }

    /** Encodes a single character as UTF-8.
     * 
     * The charCode parameter takes the character code as a number, not the character itself.
     */
    private char(charCode: number) {
        switch (true) {
            case (charCode <= 0x7F):
                this.byte(charCode);
                break;
            case (charCode <= 0x7FF):
                this.byte(0b11000000 | (charCode >> 6))
                    .byte(0b10000000 | (charCode & 0b111111));
                break;
            case (charCode <= 0xFFFF):
                this.byte(0b11100000 | (charCode >> 12))
                    .byte(0b10000000 | ((charCode >> 6) & 0b111111))
                    .byte(0b10000000 | (charCode & 0b111111));
                break;
            case (charCode <= 0x10FFFF):
                this.byte(0b11110000 | (charCode >> 18))
                    .byte(0b10000000 | ((charCode >> 12) & 0b111111))
                    .byte(0b10000000 | ((charCode >> 6) & 0b111111))
                    .byte(0b10000000 | (charCode & 0b111111));
                break;
            default:
                throw new Error("Error in encoding in UTF-8: value out of bounds.");
        }
    }

    /** Stores the length of the string instead of putting a null byte at the end,
     * since the string with null termination obviously can't store null characters.
     */
    public string(str: string) {
        this.vu(str.length);
        for (let i = 0; i < str.length; i++) {
            this.char(str.codePointAt(i) as number);
        }
        return this;
    }

    /** Stores an integer/float using 32 bit precision. */
    public float(num: number) {
        this.f32[0] = num;
        return this.byte(this.u8[0])
                .byte(this.u8[1])
                .byte(this.u8[2])
                .byte(this.u8[3]);
    }

    /** Stores many values, and can even do it recursively. */
    public data(data: OABDATA) {
        switch (typeof data) {
            case "number": // Any number
                {
                    if (Number.isFinite(data)) { // Integer/Float
                        if (Number.isInteger(data)) { // Integer
                            if (data >= 0) {
                                this.byte(1).vu(data); // Positive int
                            } else {
                                this.byte(2).vu(-data); // Negative int
                            }
                        } else { // Float
                            this.byte(3).float(data);
                        }
                    } else { // NaN, Infinity, etc
                        throw new Error(`Cannot store ${data}!`);
                    }
                    break;
                }
            case "boolean": // Boolean
                this.byte(
                    data ?
                        4 : // True
                        5 // False
                );
                break;
            case "object": // Any object
                {
                    if (Array.isArray(data)) { // Array
                        this.byte(6);
                        this.vu(data.length);

                        for (let i = 0; i < data.length; i++) {
                            this.data(data[i]);
                        }
                    } else if (data !== null) {  // Any type of object other than null
                        const keys = Object.keys(data);
                        this.byte(7);
                        this.vu(keys.length);

                        for (const key of keys) {
                            const value = data[key];
                            const tableEnc = this.lookup.indexOf(key);

                            if (tableEnc === -1) { // Not found key
                                this.byte(1).string(key); // Store it as a string
                                if (this.warnIfNoLookup) console.warn(`A key wasn't in the lookup table! ${value}.`);
                            } else { // Key found
                                this.byte(2).vu(tableEnc); // Store the index
                            }

                            this.data(value); // Store the value
                        }
                    } else {
                        this.byte(8); // Null is an object
                    }
                    break;
                }
            case "string": // String
                this.byte(9).string(data);
                break;
            default: // If none of these criteria are met, throw an error
                 throw new Error(`Unknown data type! ${typeof (data)}`);
        }
        return this;
    }

    /** Get a Uint8Array of everything you wrote. */
    public out(): Uint8Array {
        return new Uint8Array(this.buffer);
    }
}
