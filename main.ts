type Lookup = string[];

// Lookup is shared between the receiver and the sender, and it's only use is for objects' keys.
// When both the receiver and the sender share the lookup, we don't need to send the object key as a string.
// Rather we can point out that both the receiver and the sender share it,
// so instead of a string, we put a number which corresponds to the lookup. This saves a lot of space.

/** Unfortunately, typescript does not have any real definition for NaN, I was forced to include number here, even though the only number is ironically.. not a number */
type OABDATA = number | bigint | string | OABDATA[] | {[key: string]: OABDATA} | boolean | null | undefined;

/** For reading data from incoming packets */
export class Reader
{
    /** The index of the reader */
    public at: number;

    /** The buffer's length */
    private _length: number;

    /** The reader's buffer */
    private _buffer: Uint8Array;

    /** The lookup */
    public lookup: Lookup;

    /** Whether to throw an error when `getData`'s object retrivation fails. */
    public OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE: boolean;

    /** Whether to throw an error when `getData` hits an unknown index. */
    public OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX: boolean;

    /** Whether to throw an error when `stringLN` tries accessing out of bounds areas. */
    public OAB_READER_ERROR_ON_OOB: boolean;

    /** Whether to throw an error when `byte` tries accessing out of bounds areas. */
    public OAB_READER_ERROR_ON_BYTE_OOB: boolean;

    /** Whether to throw an error when `string` hits the end of the buffer before hitting a null character. */
    public OAB_READER_ERROR_ON_STRING_HIT_EOB: boolean;

    /** Whether to throw an error when `vu` hits the end of the buffer before hitting end of vu. */
    public OAB_READER_ERROR_ON_VU_HIT_EOB: boolean;

    /** Whether to throw an error when `getData`'s object retrieving fails to get a lookup. */
    public OAB_READER_ERROR_ON_OOB_LOOKUP: boolean;

    constructor(content: Uint8Array, options?: {
        lookup?: Lookup
        OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE?: boolean
        OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX?: boolean
        OAB_READER_ERROR_ON_OOB?: boolean
        OAB_READER_ERROR_ON_BYTE_OOB?: boolean
        OAB_READER_ERROR_ON_STRING_HIT_EOB?: boolean
        OAB_READER_ERROR_ON_VU_HIT_EOB?: boolean
        OAB_READER_ERROR_ON_OOB_LOOKUP?: boolean
    })
    {
        this.at = 0;
        this._buffer = content;
        this.lookup = options?.lookup || [];
        this._length = this._buffer.length;
        this.OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE = options?.OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE || false;
        this.OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX = options?.OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX || false;
        this.OAB_READER_ERROR_ON_OOB = options?.OAB_READER_ERROR_ON_OOB || false;
        this.OAB_READER_ERROR_ON_BYTE_OOB = options?.OAB_READER_ERROR_ON_BYTE_OOB || false;
        this.OAB_READER_ERROR_ON_STRING_HIT_EOB = options?.OAB_READER_ERROR_ON_STRING_HIT_EOB || false;
        this.OAB_READER_ERROR_ON_VU_HIT_EOB = options?.OAB_READER_ERROR_ON_VU_HIT_EOB || false;
        this.OAB_READER_ERROR_ON_OOB_LOOKUP = options?.OAB_READER_ERROR_ON_OOB_LOOKUP || false;
    }

    /** The buffer's length */
    public get length(): number
    {
        return this._length;
    }

    /** The reader's buffer */
    public get buffer(): Uint8Array
    {
        return this._buffer;
    }

    /** Set the reader's buffer */
    public set buffer(newBuf: Uint8Array)
    {
        this._buffer = newBuf;
        this._length = this._buffer.length;
    }

    /** Unsigned 8 bit integer */
    public byte(): bigint
    {
        let byte = this._buffer[this.at++];
        if((byte === undefined) && this.OAB_READER_ERROR_ON_BYTE_OOB) throw new Error("`byte` tried accessing out of bounds!");
        return BigInt(byte || 0);
    }

    /** LEB128, variable length decoding of an unsigned integer */
    public vu(): bigint
    {
        let out = 0n;
        let at = 0n;
        while(true)
        {
            if(!(this._buffer[this.at] & 128)) break;
            if(this._buffer[this.at + 1] === undefined)
            {
                if(this.OAB_READER_ERROR_ON_VU_HIT_EOB) throw new Error("`vu` hit End of Buffer before vu ends!");
                //break;
            }
            out |= (this.byte() & 127n) << at;
            at += 7n;
        }
        out |= this.byte() << at;
        return out;
    }

    /** Variable length decoding of a signed integer */
    public vi(): bigint
    {
        let data = this.vu();
        let sign = data & 1n;
        data >>= 1n;
        return sign ? -data : data;
    }

    /** Null terminated string */
    public string(): string
    {
        let final = "";
        while(true)
        {
            if(this._buffer[this.at] === 0) break;
            if(this._buffer[this.at] === undefined)
            {
                if(this.OAB_READER_ERROR_ON_STRING_HIT_EOB) throw new Error("`string` hit End of Buffer before hitting null!");
                break;
            }
            final += String.fromCharCode(Number(this.vu()));
        }
        this.at++;
        return final;
    }

    /** String with its length stored in the front */
    public stringLN(): string
    {
        let final = "";
        let strLen = this.vu();
        for(let i = 0n; i < strLen; i++)
        {
            if(this._buffer[this.at] !== undefined) final += String.fromCharCode(Number(this.vu()));
            else
            {
                if(this.OAB_READER_ERROR_ON_OOB)
                {
                    throw new Error(`\`stringLN\` tried to access out of bounds! String length: ${strLen}, buffer length: ${this._length}, buffer at: ${this.at}`);
                }
                break;
            }
        }
        return final;
    }

    /** Retrieves stuff like objects, arrays, and can even do it recursively */
    public getData(): OABDATA // Further explained in the Writer
    {
        let byte = this.byte();
        switch (byte)
        {
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
                let arrLen = this.vu(),
                    arr: OABDATA = [];
                for(let i = 0n; i < arrLen; i++)
                {
                    if(this._buffer[this.at] !== undefined) arr.push(this.getData());
                    else
                    {
                        if(this.OAB_READER_ERROR_ON_OOB)
                        {
                            throw new Error(`\`getData\`'s array storing tried to access out of bounds! Array length: ${arrLen}, buffer length: ${this._length}, buffer at: ${this.at}`);
                        }
                        break;
                    }
                }
                return arr;
            }

            case 4n: // Any object
            {
                let objKeyLen = this.vu(),
                    final: {
                        [key: string]: OABDATA
                    } = {};
                for(let i = 0n; i < objKeyLen; i++)
                {
                    if(this._buffer[this.at] !== undefined)
                    {
                        let key;
                        let byte = this.byte();
                        switch(byte)
                        {
                            case 0n:
                                key = this.lookup[Number(this.vu())];
                                if(key === undefined) // Something has gone terribly wrong.
                                    if(this.OAB_READER_ERROR_ON_OOB_LOOKUP) throw new Error(`\`getData\`'s object key strong looked up a value out of bounds!`)
                                break;
                            case 1n:
                                key = this.string();
                                break;
                            case 2n:
                                key = this.stringLN();
                                break;
                            default: // Something has gone terribly wrong.
                                key = undefined;
                                if(this.OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE) throw new Error(`\`getData\`'s object key storing got an unexpected byte! Available options: 0n, 1n, 2n. Instead got ${byte}`);
                                break;
                        }
                        final[key as any] = this.getData();
                    }
                    else
                    {
                        if(this.OAB_READER_ERROR_ON_OOB)
                        {
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

            default: // Something has gone terribly wrong.
            {
                if(this.OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX) throw new Error(`Unexpected index! Expected 0n, 1n, 2n... 10n, instead got ${byte}`);
                return undefined;
            }
        }
    }

    /** Get the rest of the reader data after this.at.
     * 
     * Uses `Uint8Array.prototype.subarray`.
    */
    public rest(): Uint8Array
    {
        return this._buffer.subarray(this.at, this._length);
    }
}

/** For writing data to outgoing packets */
export class Writer
{
    /** How much data we have written */
    private _at: number;

    /** The buffer itself */
    private _buffer: number[];

    /** The reverse lookup */
    public lookup: Lookup;

    /** Whether to log a warning if a lookup wasn't found */
    public OAB_WRITER_WARN_LOOKUP_NOT_FOUND: boolean;

    /** Whether to log a warning if trying to store an integer with `storeData` */
    public OAB_WRITER_WARN_INT_NOT_SUPP: boolean;

    constructor(options?: {
        lookup?: Lookup
        OAB_WRITER_WARN_LOOKUP_NOT_FOUND?: boolean
        OAB_WRITER_WARN_INT_NOT_SUPP?: boolean
    })
    {
        this._at = 0;
        this._buffer = [];
        this.lookup = options?.lookup || [];
        this.OAB_WRITER_WARN_INT_NOT_SUPP = options?.OAB_WRITER_WARN_INT_NOT_SUPP || false;
        this.OAB_WRITER_WARN_LOOKUP_NOT_FOUND = options?.OAB_WRITER_WARN_LOOKUP_NOT_FOUND || false;
    }

    /** How much data we have written */
    public get at(): number
    {
        return this._at;
    }

    /** The buffer itself */
    public get buffer(): number[]
    {
        return this._buffer;
    }

    /** Does not actually store the full BigInt.
     * Clamps at 255.
    */
    public byte(num: bigint)
    {
        this._buffer[this._at++] = Number(num > 255n ? 255 : num);
        return this;
    }

    /** LEB128, variable length encoding of an unsigned integer. Stores 7 bits of a number at a time, and uses the 8th bit to tell the reader to continue reading.
     * Attempting to store a negative integer will throw an error.
    */
    public vu(num: bigint)
    {
        if(num < 0) throw new Error(`Cannot store negative integers with vu! ${num}`);

        do
        {
            let part = num & 127n;
            num >>= 7n;
            if (num) part |= 128n;
            this.byte(part);
        } while(num)
        return this;
    }

    /** Variable length encoding of a signed integer
     *  
     * Stores the sign in a single bit.
    */
    public vi(num: bigint)
    {
        let sign = num < 0;
        
        return this.vu(((sign ? -num : num) << 1n) | (sign ? 1n: 0n));
    }

    /** Null terminated string. */
    public string(str: string)
    {
        let strLen = str.length;
        for(let i = 0; i < strLen; i++)
        {
            this.vu(BigInt(str.charCodeAt(i))); // Store the charcodes in vu form, since some charcodes are above 255 (which is the max limit for byte)
        }
        this.byte(0n); // Null termination
        return this;
    }

    /** Stores the length of the string instead of putting a null byte at the end, since the string with null termination obviously can't store null characters */
    public stringLN(str: string)
    {
        let strLen = str.length;
        this.vu(BigInt(strLen));
        for(let i = 0; i < strLen; i++)
        {
            this.vu(BigInt(str.charCodeAt(i))); // Store the charcodes in vu form, since some charcodes are above 255 (which is the max limit for byte)
        }
        return this;
    }

    /** Stores stuff like objects, arrays, and can even do it recursively */
    public storeData(val: OABDATA, storeStringAsNT: boolean = true)
    {
        switch (typeof val)
        {
            case "string": // String
            {
                if(storeStringAsNT)
                {
                    this.byte(0n);
                    this.string(val);
                }
                else
                {
                    this.byte(9n);
                    this.stringLN(val);
                }
                break;
            }

            case "number": // Any number
            {
                if(isNaN(val)) // NaN
                {
                    this.byte(2n);
                }
                else if(Number.isInteger(val)) // Integer
                {
                    this.storeData(BigInt(val), storeStringAsNT);
                    if(this.OAB_WRITER_WARN_INT_NOT_SUPP) console.warn("Warning: Regular integers are not supported. However, it was automatically converted to a bigint.");
                }
                else if(val === Infinity) // Positive Infinity
                {
                    this.byte(11n);
                }
                else if(val === -Infinity) // Negative Infinity
                {
                    this.byte(12n);
                }
                else // Float
                {
                    throw new Error("Floating point numbers are currently not supported.");
                }
                break;
            }

            case "bigint": // BigInt
            {
                if(val < 0)
                {
                    this.byte(1n); // Since already we're using a byte to denote the type of the object stored, might as well just store negative integers like this.
                    this.vu(-val);
                }
                else
                {
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
                if(Array.isArray(val)) // Array
                {
                    this.byte(3n);
                    this.vu(BigInt(val.length)); // number of elements in the array
                    for(let i of val)
                    {
                        this.storeData(i);
                    }
                    break;
                }
                if(val !== null) // Any type of object other than null
                {
                    let valKeys = Object.keys(val);
                    this.byte(4n);
                    this.vu(BigInt(valKeys.length)); // Number of properties in the object
                    for(let value of valKeys)
                    {
                        let tableEnc = this.lookup.indexOf(value);
                        if(tableEnc !== -1) // If the lookup table found a lookup value,
                        {
                            this.byte(0n); // tell the receiver that a value was found.
                            this.vu(BigInt(tableEnc));
                        } 
                        else // If it didn't, then encode the original property, and tell the receiver not to look it up, and the fact that it's either
                        {
                            if(storeStringAsNT)
                            {
                                this.byte(1n); // an NT string,
                                this.string(value);
                            }
                            else
                            {
                                this.byte(2n); // or an LN string.
                                this.stringLN(value);
                            }
                            if(this.OAB_WRITER_WARN_LOOKUP_NOT_FOUND) console.warn(`Found a key that wasn't in the lookup table! ${value}.`); // And optionally log a warning.
                        }
                        this.storeData(val[value]);
                    }
                    break;
                }
                this.byte(8n); // null is an object
                break;
            }

            case "undefined": // Undefined
            {
                this.byte(7n);
                break;
            }

            default: // If none of these criteria are met (such as a function being passed), throw an error
            {
                throw new Error(`Unknown data type! ${typeof(val)}`);
            }
        }
        return this;
    }

    /** Get a Uint8Array of everything you wrote. */
    public out(): Uint8Array
    {
        return new Uint8Array(this._buffer);
    }

    /** Set the buffer to an empty array and return the old buffer */
    public flush(): Uint8Array
    {
        let out = new Uint8Array(this._buffer);
        this._at = 0;
        this._buffer = [];
        return out;
    }
}