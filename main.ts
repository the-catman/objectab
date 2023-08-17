type RegularLookup = string[];
interface Lookup {[key: number]: string};
interface ReverseLookup {[key: string]: string};

// Lookup is shared between the receiver and the sender, and it's only use is for objects' keys.
// When both the receiver and the sender share the lookup, we don't need to send the object key as a string.
// Rather we can point out that both the receiver and the sender share it,
// so instead of a string, we put a number which corresponds to the lookup. This saves a lot of space.

/** Unfortunately, typescript does not have any real definition for NaN, I was forced to include number here, even though the only number is ironically.. not a number */
type OABDATA = number | bigint | string | any[] | {[key: string]: OABDATA} | boolean | null | undefined;

/** For reading data from incoming packets */
export class Reader
{
    /** The index of the reader */
    at: number;

    /** The reader's buffer */
    buffer: Uint8Array;

    /** The lookup */
    lookup: Lookup;

    constructor(content: Uint8Array, lookupJSON: RegularLookup = [])
    {
        this.at = 0;
        this.buffer = content;
        this.lookup = {...lookupJSON};
    }

    /** Unsigned 8 bit integer */
    byte(): bigint
    {
        return BigInt(this.buffer[this.at++] || 0);
    }

    /** LEB128, variable length decoding of an unsigned integer */
    vu(): bigint
    {
        let out = 0n;
        let at = 0n;
        while (this.buffer[this.at] & 128)
        {
            out |= (this.byte() & 127n) << at;
            at += 7n;
        }
        out |= this.byte() << at;
        return out;
    }

    /** Variable length encoding of a signed integer */
    vi(): bigint
    {
        let data = this.vu();
        let sign = data & 1n;
        data >>= 1n;
        return sign ? -data : data;
    }

    /** Null terminated string */
    string(): string
    {
        let final = "";
        while(this.buffer[this.at])
        {
            final += String.fromCharCode(Number(this.vu()));
        }
        this.at++;
        return final;
    }

    /** String with its length stored in the front */
    stringLN(): string
    {
        let final = "";
        let strLen = this.vu();
        for(let i = 0; i < strLen; i++)
        {
            final += String.fromCharCode(Number(this.vu()));
        }
        return final;
    }

    /** Retrieves stuff like objects, arrays, and can even do it recursively */
    getData(): OABDATA // Further explained in the Writer
    {
        switch (this.byte())
        {
            case 0n: // String
            {
                return this.string();
            }

            case 1n: // Negative integers
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
                for(let i = 0; i < arrLen; i++)
                {
                    arr.push(this.getData());
                }
                return arr;
            }

            case 4n: // Any object
            {
                let objKeyLen = this.vu(),
                    final: {
                        [key: string]: OABDATA
                    } = {};
                for(let i = 0; i < objKeyLen; i++)
                {
                    final[this.byte() ? this.string() : this.lookup[Number(this.vu())]] = this.getData();
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

            case 10n: // Positive integers
            {
                return this.vu();
            }
        }
    }

    /** Get the entire buffer */
    out(): Uint8Array
    {
        return this.buffer;
    }

    /** Get the rest of the reader data after the this.at */
    rest(): Uint8Array
    {
        return this.buffer.subarray(this.at, this.buffer.length);
    }
}

/** For writing data to outgoing packets */
export class Writer
{
    /** How much data we have written */
    length: number;

    /** The buffer itself */
    buffer: number[];

    /** The reverse lookup */
    lookupReverse: ReverseLookup;

    constructor(lookupJSON: RegularLookup = [])
    {
        this.length = 0;
        this.buffer = [];
        this.lookupReverse = Object.fromEntries(Object.entries({...lookupJSON}).map(a => a.reverse()));
    }

    /** Does not actually store the full BigInt. */
    public byte(num: bigint)
    {
        this.buffer[this.length++] = Number(num > 255n ? 255 : num);
    }

    /** LEB128, variable length encoding of an unsigned integer. Stores 7 bits of a number at a time, and uses the 8th bit to tell the reader to continue reading.
     * DO NOT ATTEMPT to store a negative number with this. Javascript will crash.
    */
    public vu(num: bigint)
    {
        do
        {
            let part = num & 127n;
            num >>= 7n;
            if (num) part |= 128n;
            this.byte(part);
        } while(num)
        return this;
    }

    /** Variable length encoding of a signed integer */
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
                    this.storeData(BigInt(val));
                    if(OAB_WARN_INT_NOT_SUPP) console.warn("Warning: Regular integers are not supported. However, it was automatically converted to a bigint.");
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
                    for(let i in valKeys)
                    {
                        /** The key of the object we need to store */
                        let value: string = valKeys[i];
                        let tableEnc = this.lookupReverse[value];
                        if(tableEnc !== undefined) // If the lookup table found a lookup value,
                        {
                            this.byte(0n); // tell the receiver that a value was found.
                            this.vu(BigInt(tableEnc));
                        } 
                        else // If it didn't, then put the original property back,
                        {
                            this.byte(1n); // and tell the receiver not to look it up.
                            this.string(value);
                            if(OAB_WARN_LOOKUP_NOT_FOUND) console.warn(`Found a key that wasn't in the lookup table! ${value}.`);
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
    out(): Uint8Array
    {
        return new Uint8Array(this.buffer);
    }
}

let OAB_WARN_LOOKUP_NOT_FOUND = false;
let OAB_WARN_INT_NOT_SUPP = false;

export function OAB_WARN_LOOKUP_NOT_FOUND_SET(val: boolean)
{
    OAB_WARN_LOOKUP_NOT_FOUND = val;
}

export function OAB_WARN_INT_NOT_SUPP_SET(val: boolean)
{
    OAB_WARN_INT_NOT_SUPP = val;
}