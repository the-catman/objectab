type RegularLookup = string[];
interface Lookup {
    [key: number]: string;
}
interface ReverseLookup {
    [key: string]: string;
}
/** Unfortunately, typescript does not have any real definition for NaN, I was forced to include number here, even though the only number is ironically.. not a number */
type OABDATA = number | bigint | string | any[] | {
    [key: string]: OABDATA;
} | boolean | null | undefined;
/** For reading data from incoming packets */
export declare class Reader {
    /** The index of the reader */
    at: number;
    /** The reader's buffer */
    buffer: Uint8Array;
    /** The lookup */
    lookup: Lookup;
    constructor(content: Uint8Array, lookupJSON?: RegularLookup);
    /** Unsigned 8 bit integer */
    byte(): bigint;
    /** LEB128, variable length decoding of an unsigned integer */
    vu(): bigint;
    /** Variable length encoding of a signed integer */
    vi(): bigint;
    /** Null terminated string */
    string(): string;
    /** String with its length stored in the front */
    stringLN(): string;
    /** Retrieves stuff like objects, arrays, and can even do it recursively */
    getData(): OABDATA;
    /** Get the entire buffer */
    out(): Uint8Array;
    /** Get the rest of the reader data after the this.at */
    rest(): Uint8Array;
}
/** For writing data to outgoing packets */
export declare class Writer {
    /** How much data we have written */
    length: number;
    /** The buffer itself */
    buffer: number[];
    /** The reverse lookup */
    lookupReverse: ReverseLookup;
    constructor(lookupJSON?: RegularLookup);
    /** Does not actually store the full BigInt. */
    byte(num: bigint): void;
    /** LEB128, variable length encoding of an unsigned integer. Stores 7 bits of a number at a time, and uses the 8th bit to tell the reader to continue reading.
     * DO NOT ATTEMPT to store a negative number with this. Javascript will crash.
    */
    vu(num: bigint): this;
    /** Variable length encoding of a signed integer */
    vi(num: bigint): this;
    /** Null terminated string. */
    string(str: string): this;
    /** Stores the length of the string instead of putting a null byte at the end, since the string with null termination obviously can't store null characters */
    stringLN(str: string): this;
    /** Stores stuff like objects, arrays, and can even do it recursively */
    storeData(val: OABDATA, storeStringAsNT?: boolean): this;
    /** Get a Uint8Array of everything you wrote. */
    out(): Uint8Array;
}
export declare function OAB_WARN_LOOKUP_NOT_FOUND_SET(val: boolean): void;
export declare function OAB_WARN_INT_NOT_SUPP_SET(val: boolean): void;
export {};
//# sourceMappingURL=main.d.ts.map