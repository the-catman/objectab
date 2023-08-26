let arrayBuffer = new ArrayBuffer(8);
let f32 = new Float32Array(arrayBuffer);
let f64 = new Float64Array(arrayBuffer);
let u64 = new BigUint64Array(arrayBuffer);
/** For reading data from incoming packets */
export class Reader {
    /** The index of the reader */
    at;
    /** The buffer's length */
    _length;
    /** The reader's buffer */
    _buffer;
    /** The lookup */
    lookup;
    /** Whether to throw an error when `getData`'s object retrivation fails. */
    OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE;
    /** Whether to throw an error when `getData` hits an unknown index. */
    OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX;
    /** Whether to throw an error when `stringLN` tries accessing out of bounds areas. */
    OAB_READER_ERROR_ON_OOB;
    /** Whether to throw an error when `byte` tries accessing out of bounds areas. */
    OAB_READER_ERROR_ON_BYTE_OOB;
    /** Whether to throw an error when `string` hits the end of the buffer before hitting a null character. */
    OAB_READER_ERROR_ON_STRING_HIT_EOB;
    /** Whether to throw an error when `vu` hits the end of the buffer before hitting end of vu. */
    OAB_READER_ERROR_ON_VU_HIT_EOB;
    /** Whether to throw an error when `getData`'s object retrieving fails to get a lookup. */
    OAB_READER_ERROR_ON_OOB_LOOKUP;
    constructor(content, options) {
        this.at = 0;
        this._buffer = content;
        this.lookup = options?.lookup || [];
        this._length = this._buffer.length;
        this.OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE = options?.OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE ?? false;
        this.OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX = options?.OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX ?? false;
        this.OAB_READER_ERROR_ON_OOB = options?.OAB_READER_ERROR_ON_OOB ?? false;
        this.OAB_READER_ERROR_ON_BYTE_OOB = options?.OAB_READER_ERROR_ON_BYTE_OOB ?? false;
        this.OAB_READER_ERROR_ON_STRING_HIT_EOB = options?.OAB_READER_ERROR_ON_STRING_HIT_EOB ?? false;
        this.OAB_READER_ERROR_ON_VU_HIT_EOB = options?.OAB_READER_ERROR_ON_VU_HIT_EOB ?? false;
        this.OAB_READER_ERROR_ON_OOB_LOOKUP = options?.OAB_READER_ERROR_ON_OOB_LOOKUP ?? false;
    }
    /** The buffer's length */
    get length() {
        return this._length;
    }
    /** The reader's buffer */
    get buffer() {
        return this._buffer;
    }
    /** Set the reader's buffer */
    set buffer(newBuf) {
        this._buffer = newBuf;
        this._length = this._buffer.length;
    }
    /** Unsigned 8 bit integer */
    byte() {
        let byte = this._buffer[this.at++];
        if ((byte === undefined) && this.OAB_READER_ERROR_ON_BYTE_OOB)
            throw new Error("`byte` tried accessing out of bounds!");
        return BigInt(byte || 0);
    }
    /** LEB128, variable length decoding of an unsigned integer */
    vu() {
        let out = 0n;
        let at = 0n;
        while (true) {
            if (!(this._buffer[this.at] & 128))
                break;
            if (this._buffer[this.at + 1] === undefined) {
                if (this.OAB_READER_ERROR_ON_VU_HIT_EOB)
                    throw new Error("`vu` hit End of Buffer before vu ends!");
                //break;
            }
            out |= (this.byte() & 127n) << at;
            at += 7n;
        }
        out |= this.byte() << at;
        return out;
    }
    /** Variable length decoding of a signed integer */
    vi() {
        let data = this.vu();
        let sign = data & 1n;
        data >>= 1n;
        return sign ? -data : data;
    }
    /** Null terminated string */
    string() {
        let final = "";
        while (true) {
            if (this._buffer[this.at] === 0)
                break;
            if (this._buffer[this.at] === undefined) {
                if (this.OAB_READER_ERROR_ON_STRING_HIT_EOB)
                    throw new Error("`string` hit End of Buffer before hitting null!");
                break;
            }
            final += String.fromCharCode(Number(this.vu()));
        }
        this.at++;
        return final;
    }
    /** String with its length stored in the front */
    stringLN() {
        let final = "";
        let strLen = this.vu();
        for (let i = 0n; i < strLen; i++) {
            if (this._buffer[this.at] !== undefined)
                final += String.fromCharCode(Number(this.vu()));
            else {
                if (this.OAB_READER_ERROR_ON_OOB) {
                    throw new Error(`\`stringLN\` tried to access out of bounds! String length: ${strLen}, buffer length: ${this._length}, buffer at: ${this.at}`);
                }
                break;
            }
        }
        return final;
    }
    /** Integers/Floats as 32 bit numbers */
    float32() {
        u64[0] = this.vu();
        return f32[0];
    }
    /** Integers/Floats as 64 bit numbers */
    float64() {
        u64[0] = this.vu();
        return f64[0];
    }
    /** Retrieves stuff like objects, arrays, and can even do it recursively */
    getData() {
        let byte = this.byte();
        switch (byte) {
            case 0n: // String
                {
                    return this.string();
                }
            case 1n: // Negative BigInts
                {
                    return -this.vu();
                }
            case 2n: // NaN
                {
                    return NaN;
                }
            case 3n: // Array
                {
                    let arrLen = this.vu(), arr = [];
                    for (let i = 0n; i < arrLen; i++) {
                        if (this._buffer[this.at] !== undefined)
                            arr.push(this.getData());
                        else {
                            if (this.OAB_READER_ERROR_ON_OOB) {
                                throw new Error(`\`getData\`'s array storing tried to access out of bounds! Array length: ${arrLen}, buffer length: ${this._length}, buffer at: ${this.at}`);
                            }
                            break;
                        }
                    }
                    return arr;
                }
            case 4n: // Any object
                {
                    let objKeyLen = this.vu(), final = {};
                    for (let i = 0n; i < objKeyLen; i++) {
                        if (this._buffer[this.at] !== undefined) {
                            let key;
                            let byte = this.byte();
                            switch (byte) {
                                case 0n:
                                    key = this.lookup[Number(this.vu())];
                                    if (key === undefined) // Something has gone terribly wrong.
                                        if (this.OAB_READER_ERROR_ON_OOB_LOOKUP)
                                            throw new Error(`\`getData\`'s object key strong looked up a value out of bounds!`);
                                    break;
                                case 1n:
                                    key = this.string();
                                    break;
                                case 2n:
                                    key = this.stringLN();
                                    break;
                                default: // Something has gone terribly wrong.
                                    key = undefined;
                                    if (this.OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE)
                                        throw new Error(`\`getData\`'s object key storing got an unexpected byte! Available options: 0n, 1n, 2n. Instead got ${byte}`);
                                    break;
                            }
                            final[key] = this.getData();
                        }
                        else {
                            if (this.OAB_READER_ERROR_ON_OOB) {
                                throw new Error(`\`getData\`'s object storing tried to access out of bounds! Object length: ${objKeyLen}, buffer length: ${this._length}, buffer at: ${this.at}`);
                            }
                            break;
                        }
                    }
                    return final;
                }
            case 5n: // True
                {
                    return true;
                }
            case 6n: // False
                {
                    return false;
                }
            case 7n: // Undefined
                {
                    return undefined;
                }
            case 8n: // Null
                {
                    return null;
                }
            case 9n: // Length-based string
                {
                    return this.stringLN();
                }
            case 10n: // Positive BigInts
                {
                    return this.vu();
                }
            case 11n: // Positive Infinity
                {
                    return Infinity;
                }
            case 12n: // Negative Infinity
                {
                    return -Infinity;
                }
            case 13n: // Integers and Floats as 32 bit numbers
                {
                    return this.float32();
                }
            case 14n: // Integers and Floats as 64 bit numbers
                {
                    return this.float64();
                }
            default: // Something has gone terribly wrong.
                {
                    if (this.OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX)
                        throw new Error(`Unexpected index! Got ${byte}`);
                    return undefined;
                }
        }
    }
    /** Get the rest of the reader data after this.at.
     *
     * Uses `Uint8Array.prototype.subarray`.
    */
    rest() {
        return this._buffer.subarray(this.at, this._length);
    }
}
/** For writing data to outgoing packets */
export class Writer {
    /** How much data we have written */
    _at;
    /** The buffer itself */
    _buffer;
    /** The reverse lookup */
    lookup;
    /** Whether to log a warning if a lookup wasn't found */
    OAB_WRITER_WARN_LOOKUP_NOT_FOUND;
    /** Whether to store strings as null-terminated strings or length based strings */
    OAB_WRITER_STORE_STRING_AS_NT;
    /** Whether to store floats as 32 bits or 64 bits */
    OAB_WRITER_STORE_FLOAT_AS_32;
    constructor(options) {
        this._at = 0;
        this._buffer = [];
        this.lookup = options?.lookup || [];
        this.OAB_WRITER_WARN_LOOKUP_NOT_FOUND = options?.OAB_WRITER_WARN_LOOKUP_NOT_FOUND ?? false;
        this.OAB_WRITER_STORE_STRING_AS_NT = options?.OAB_WRITER_STORE_STRING_AS_NT ?? true;
        this.OAB_WRITER_STORE_FLOAT_AS_32 = options?.OAB_WRITER_STORE_FLOAT_AS_32 ?? true;
    }
    /** How much data we have written */
    get at() {
        return this._at;
    }
    /** The buffer itself */
    get buffer() {
        return this._buffer;
    }
    /** Does not actually store the full BigInt.
     * Clamps at 255.
    */
    byte(num) {
        this._buffer[this._at++] = Number(num > 255n ? 255 : num);
        return this;
    }
    /** LEB128, variable length encoding of an unsigned integer. Stores 7 bits of a number at a time, and uses the 8th bit to tell the reader to continue reading.
     * Attempting to store a negative integer will throw an error.
    */
    vu(num) {
        if (num < 0)
            throw new Error(`Cannot store negative integers with vu! ${num}`);
        do {
            let part = num & 127n;
            num >>= 7n;
            if (num)
                part |= 128n;
            this.byte(part);
        } while (num);
        return this;
    }
    /** Variable length encoding of a signed integer
     *
     * Stores the sign in a single bit.
    */
    vi(num) {
        let sign = num < 0;
        return this.vu(((sign ? -num : num) << 1n) | (sign ? 1n : 0n));
    }
    /** Null terminated string. */
    string(str) {
        let strLen = str.length;
        for (let i = 0; i < strLen; i++) {
            this.vu(BigInt(str.charCodeAt(i))); // Store the charcodes in vu form, since some charcodes are above 255 (which is the max limit for byte)
        }
        this.byte(0n); // Null termination
        return this;
    }
    /** Stores the length of the string instead of putting a null byte at the end, since the string with null termination obviously can't store null characters */
    stringLN(str) {
        let strLen = str.length;
        this.vu(BigInt(strLen));
        for (let i = 0; i < strLen; i++) {
            this.vu(BigInt(str.charCodeAt(i))); // Store the charcodes in vu form, since some charcodes are above 255 (which is the max limit for byte)
        }
        return this;
    }
    /** Stores an integer/float as a 32 bit number */
    float32(num) {
        f32[0] = num;
        this.vu(u64[0]);
        return this;
    }
    /** Stores an integer/float as a 64 bit number */
    float64(num) {
        f64[0] = num;
        this.vu(u64[0]);
        return this;
    }
    /** Stores stuff like objects, arrays, and can even do it recursively */
    storeData(val) {
        switch (typeof val) {
            case "string": // String
                {
                    if (this.OAB_WRITER_STORE_STRING_AS_NT) {
                        this.byte(0n);
                        this.string(val);
                    }
                    else {
                        this.byte(9n);
                        this.stringLN(val);
                    }
                    break;
                }
            case "number": // Any number
                {
                    if (isNaN(val)) // NaN
                     {
                        this.byte(2n);
                    }
                    else if (val === Infinity) // Positive Infinity
                     {
                        this.byte(11n);
                    }
                    else if (val === -Infinity) // Negative Infinity
                     {
                        this.byte(12n);
                    }
                    else // Integer/Float
                     {
                        if (this.OAB_WRITER_STORE_FLOAT_AS_32) {
                            this.byte(13n);
                            this.float32(val);
                        }
                        else {
                            this.byte(14n);
                            this.float64(val);
                        }
                    }
                    break;
                }
            case "bigint": // BigInt
                {
                    if (val < 0) {
                        this.byte(1n); // Since already we're using a byte to denote the type of the object stored, might as well just store negative integers like this.
                        this.vu(-val);
                    }
                    else {
                        this.byte(10n);
                        this.vu(val);
                    }
                    break;
                }
            case "boolean": // Boolean
                {
                    val ? this.byte(5n) /* true */ : this.byte(6n); /* false */
                    break;
                }
            case "object": // Any object
                {
                    if (Array.isArray(val)) // Array
                     {
                        this.byte(3n);
                        this.vu(BigInt(val.length)); // number of elements in the array
                        for (let i of val) {
                            this.storeData(i);
                        }
                    }
                    else if (val !== null) // Any type of object other than null
                     {
                        let valKeys = Object.keys(val);
                        this.byte(4n);
                        this.vu(BigInt(valKeys.length)); // Number of properties in the object
                        for (let value of valKeys) {
                            let tableEnc = this.lookup.indexOf(value);
                            if (tableEnc !== -1) // If the lookup table found a lookup value,
                             {
                                this.byte(0n); // tell the receiver that a value was found.
                                this.vu(BigInt(tableEnc));
                            }
                            else // If it didn't, then encode the original property, and tell the receiver not to look it up, and the fact that it's either
                             {
                                if (this.OAB_WRITER_STORE_STRING_AS_NT) {
                                    this.byte(1n); // an NT string,
                                    this.string(value);
                                }
                                else {
                                    this.byte(2n); // or an LN string.
                                    this.stringLN(value);
                                }
                                if (this.OAB_WRITER_WARN_LOOKUP_NOT_FOUND)
                                    console.warn(`Found a key that wasn't in the lookup table! ${value}.`); // And optionally log a warning.
                            }
                            this.storeData(val[value]);
                        }
                    }
                    else {
                        this.byte(8n); // null is an object
                    }
                    break;
                }
            case "undefined": // Undefined
                {
                    this.byte(7n);
                    break;
                }
            default: // If none of these criteria are met (such as a function being passed), throw an error
                {
                    throw new Error(`Unknown data type! ${typeof (val)}`);
                }
        }
        return this;
    }
    /** Get a Uint8Array of everything you wrote. */
    out() {
        return new Uint8Array(this._buffer);
    }
    /** Set the buffer to an empty array and return the old buffer */
    flush() {
        let out = new Uint8Array(this._buffer);
        this._at = 0;
        this._buffer = [];
        return out;
    }
}
