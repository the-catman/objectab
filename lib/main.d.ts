type Lookup = string[];
/** Unfortunately, typescript does not have any real definition for NaN, I was forced to include number here, even though the only number is ironically.. not a number */
type OABDATA = number | bigint | string | OABDATA[] | {
    [key: string]: OABDATA;
} | boolean | null | undefined;
/** For reading data from incoming packets */
export declare class Reader {
    /** The index of the reader */
    at: number;
    /** The buffer's length */
    private _length;
    /** The reader's buffer */
    private _buffer;
    /** The lookup */
    lookup: Lookup;
    /** Whether to throw an error when `getData`'s object retrivation fails. */
    OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE: boolean;
    /** Whether to throw an error when `getData` hits an unknown index. */
    OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX: boolean;
    /** Whether to throw an error when `stringLN` tries accessing out of bounds areas. */
    OAB_READER_ERROR_ON_OOB: boolean;
    /** Whether to throw an error when `byte` tries accessing out of bounds areas. */
    OAB_READER_ERROR_ON_BYTE_OOB: boolean;
    /** Whether to throw an error when `string` hits the end of the buffer before hitting a null character. */
    OAB_READER_ERROR_ON_STRING_HIT_EOB: boolean;
    /** Whether to throw an error when `vu` hits the end of the buffer before hitting end of vu. */
    OAB_READER_ERROR_ON_VU_HIT_EOB: boolean;
    /** Whether to throw an error when `getData`'s object storing fails to get a lookup. */
    OAB_READER_ERROR_ON_OOB_LOOKUP: boolean;
    constructor(content: Uint8Array, options?: {
        lookup?: Lookup;
        OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE?: boolean;
        OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX?: boolean;
        OAB_READER_ERROR_ON_OOB?: boolean;
        OAB_READER_ERROR_ON_BYTE_OOB?: boolean;
        OAB_READER_ERROR_ON_STRING_HIT_EOB?: boolean;
        OAB_READER_ERROR_ON_VU_HIT_EOB?: boolean;
        OAB_READER_ERROR_ON_OOB_LOOKUP?: boolean;
    });
    /** The buffer's length */
    get length(): number;
    /** The reader's buffer */
    get buffer(): Uint8Array;
    /** Set the reader's buffer */
    set buffer(newBuf: Uint8Array);
    /** Unsigned 8 bit integer */
    byte(): bigint;
    /** LEB128, variable length decoding of an unsigned integer */
    vu(): bigint;
    /** Variable length decoding of a signed integer */
    vi(): bigint;
    /** Null terminated string */
    string(): string;
    /** String with its length stored in the front */
    stringLN(): string;
    /** Retrieves stuff like objects, arrays, and can even do it recursively */
    getData(): OABDATA;
    /** Get the rest of the reader data after this.at.
     *
     * Uses `Uint8Array.prototype.subarray`.
    */
    rest(): Uint8Array;
}
/** For writing data to outgoing packets */
export declare class Writer {
    /** How much data we have written */
    private _at;
    /** The buffer itself */
    private _buffer;
    /** The reverse lookup */
    lookup: Lookup;
    /** Whether to log a warning if a lookup wasn't found */
    OAB_WRITER_WARN_LOOKUP_NOT_FOUND: boolean;
    /** Whether to log a warning if trying to store an integer with `storeData` */
    OAB_WRITER_WARN_INT_NOT_SUPP: boolean;
    constructor(options?: {
        lookup?: Lookup;
        OAB_WRITER_WARN_LOOKUP_NOT_FOUND?: boolean;
        OAB_WRITER_WARN_INT_NOT_SUPP?: boolean;
    });
    /** How much data we have written */
    get at(): number;
    /** The buffer itself */
    get buffer(): number[];
    /** Does not actually store the full BigInt.
     * Clamps at 255.
    */
    byte(num: bigint): this;
    /** LEB128, variable length encoding of an unsigned integer. Stores 7 bits of a number at a time, and uses the 8th bit to tell the reader to continue reading.
     * Attempting to store a negative integer will throw an error.
    */
    vu(num: bigint): this;
    /** Variable length encoding of a signed integer
     *
     * Stores the sign in a single bit.
    */
    vi(num: bigint): this;
    /** Null terminated string. */
    string(str: string): this;
    /** Stores the length of the string instead of putting a null byte at the end, since the string with null termination obviously can't store null characters */
    stringLN(str: string): this;
    /** Stores stuff like objects, arrays, and can even do it recursively */
    storeData(val: OABDATA, storeStringAsNT?: boolean): this;
    /** Get a Uint8Array of everything you wrote. */
    out(): Uint8Array;
    /** Set the buffer to an empty array and return the old buffer */
    flush(): Uint8Array;
}
export {};
//# sourceMappingURL=main.d.ts.map