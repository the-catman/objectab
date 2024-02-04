# OAB

* ObjectAB or OAB stands for Object to ArrayBuffer.

# Version list

* The versions below `v1.2.0` are all **deprecated, unsafe and dangerous**. DO NOT USE THEM!

## Major updates

* `v1.0.0`: Library created.

* `v1.1.0`: Actually put error and out of bounds checking and handling. Updated documentation.

* `v1.2.0`: Better error checking. Updated the name of the error/warning options in Reader and Writer to be much better. (This means you have to update your code if you use these variables). Added support for +/- Infinity. Updated documentation.

* `v1.3.0`: Added floats, moved optional parameter of `storeData` to the constructor. Updated documentation.

## Minor updates (not permanent list)

* `v1.3.8`: Removed from NPM, major changes to documentation.

# Installation

Copy either [index.js](./index.js), [index.mjs](./index.mjs) or [index.ts](./index.ts) into your project, and then require it.

# Q&A

## What is this library?

* This is a library for converting some JavaScript objects into a Uint8Array and back. However, I didn't originally come up with the idea of doing this.

## Is it like JSON?

* In a way, yes. However, JSON is way more versatile (in the sense that everyone knows what it is), readable, less buggy, and less prone to errors. However, it is quite slow and the output is very large. JSON is also not natively a text to bytecode encoder, which means that you have to use something like `TextEncoder` to transform the JSON output to a Uint8Array.

## Is it efficient?

* It probably is way more efficient than JSON.

## Is it reliable?

* I have tested this, and it most likely is reliable. If you do find an edge case that breaks this, please, by all means, open up a ticket. I'll try and solve the issue ASAP.

## Is it buggy?

* Given the extremely sensitive nature of this, yes. If even one byte is malformed, there is a very high possibility of this breaking.

## How do I debug errors?

* You basically cannot, because the packet structure is like a chain. You cannot know what the packet as a whole means without decoding the entire packet, and if one byte is malformed, whatever comes after it is basically garbage that takes excruciating effort to debug. I highly advise that on the development server you use something like JSON, which is readable for humans, and when you have eliminated all the bugs, you move to using the library.

    * Imagine that you're baking a box cake, and halfway through, the box's instructions stop. What do you do? You have got no idea, and any action you take afterwards is based on pure speculation and trial-and-error. You might get the cake right the 5th time, but the past 4 batches were all gone down the drain.

    * Now imagine that, but on the scale of random packet noise, alongside an unhelpful computer who cannot use intuition and cannot self-correct (unlike the baker, who can probably get it right after a few tries). You might get it right after excruciating effort, but really it'd be easier to use JSON.

## Are there any things I should know before using this?

* One of the most important things is the lookup, if you're storing objects. It has to be *exactly* the same on both the sender and receiver, or else object keys will be malformed.

* You can only retrieve objects in the same order as you stored them. As exlpained above, the packets are stored in a big chain. You cannot get through point X in the chain without going through what comes before it.

* You *can* (but really shouldn't) store Integers. Just convert it to a BigInt.

* Integers and Floats take up a lot of space, as seen [here](#storedata-integerfloat).

## What does data corruption look like?

* It can really be anything. Your data could be just one character off, or be total garbage, or anywhere in between these two.

### Example code

```js
const { Reader, Writer } = require("./index.js");

// Sample data

const writer = new Writer();
writer.byte(123n);
writer.vu(1093021321n);
writer.vi(-123032321n);
writer.float32(0.123892183);
writer.string("Hello!");
writer.stringLN("Hello from LENGTH!");

const reader = new Reader(writer.out());

// Corrupted data, since we can only retrieve data in order.

console.log(reader.float32()); // 1.723597111119525e-43

console.log(reader.stringLN()); // ꘃ묯Hello!Hello from LENGTH!
```

## How does the library work?

Take a look at [the code](/index.ts) yourself. I tried to make it as readable as possible, however it is slightly spaghetti. Or, if you're too lazy, read the explaination over [here](./MECHANICS.md).

# To-do list

* Empty.

# Pull requests and issues

* Pull requests, issues, suggestions, and bug reports are welcome. You are permitted to change this to make your own version.

# Basic Example

* The code below is in JavaScript, however, porting to TypeScript is way better.

```js
const { Reader, Writer } = require("./index.js");

const writer = new Writer();

// This is a byte. Pretty simple. Attempting to store above this value will just clamp it to 255.
// Can store from 0 -> 255.
writer.byte(123n);

// This is a variable length unsigned integer (uses the LEB128 algorithm). The larger the bigint is, the larger the output. Attempting to store a negative number will throw an error.
// Can store from 0 -> (???)
writer.vu(1093021321n);

// This is a variable length signed integer. 
// You can store negative numbers with this. It is exactly like vu, except it uses 1 extra bit to store the sign.
// Can store from 0 -> (???)
writer.vi(-123032321n);

// This is a float. It's extremely space demanding, and not all that accurate (unless you use float64 which is even more space demanding, but provides more accuracy) If you can, avoid using this.
// Can store from 0 -> (???)
writer.float32(0.123892183);

// This is a null terminated string (henceforth known as NT). This is an okay way of storing data, but trying to include a null character anywhere in the string breaks it.
// Can store from 0 -> (???)
writer.string("Hello!");

// This is a length-based string (henceforth known as LN). It uses slightly more space to store the length of the string before the string itself, while being able to store null characters.
// Can store from 0 -> (???)
writer.stringLN("Hello from LENGTH!");

// Writer.out() outputs the buffer as a Uint8Array
const reader = new Reader(writer.out());

// Then to retrieve the data, we just call the corresponding functions in order.

console.log(reader.byte()); // 123n

console.log(reader.vu()); // 1093021321n

console.log(reader.vi()); // -123032321n

console.log(reader.float32()); // 0.12389218062162399

console.log(reader.string()); // "Hello!"

console.log(reader.stringLN()); // "Hello from LENGTH!"
```

# Object storing

This library can store the following:

* `NaN`
* `undefined`
* `null`
* `true`
* `false`
* `+Infinity`
* `-Infinity`
* BigInts
* Null terminated strings
* Length based strings
* Objects
* Arrays
* Integers
* Floats

* If a value is passed that does not match one of these data types, an error is thrown.

## Example code

```js
const { Reader, Writer } = require("./index.js");

const writer = new Writer();

writer.storeData([1n, 2n, 3n, [{hello: 123n}, "hello hello 1234"]]);

const reader = new Reader(writer.out());

console.log(reader.getData()); // [1n, 2n, 3n, [{hello: 123n}, "hello hello 1234"]]
```

## Note

* If your object has a number as a key, it will get converted to a string. This is a limitation of JavaScript, not the library. See [this](https://stackoverflow.com/questions/3633362/is-there-any-way-to-use-a-numeric-type-as-an-object-key) and [this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys).

```js
let obj = {1: "hello"};

console.log(obj); // { '1': 'hello' }

console.log(Object.keys(obj)); // ['1']
```

# Reader constructor

* `Reader constructor(content: Uint8Array, options?: { ... })`
    * The reader needs a buffer as a non-optional parameter. The Buffer is a Uint8Array.

    * The `Reader` may have the following for `options`:
        * [Lookups:](#lookups)
            * lookup: string[] = []

        * [Error handling:](#reader-error-handling)
            * OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX: boolean = false
            * OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE: boolean = false
            * OAB_READER_ERROR_ON_OOB: boolean = false
            * OAB_READER_ERROR_ON_BYTE_OOB: boolean = false
            * OAB_READER_ERROR_ON_STRING_HIT_EOB: boolean = false
            * OAB_READER_ERROR_ON_VU_HIT_EOB: boolean = false
            * OAB_READER_ERROR_ON_OOB_LOOKUP: boolean = false

# Writer constructor

* `Writer constructor(options?: { ... })`

    * The `Writer` may have the following for `options`:
        * [Lookups:](#lookups)
            * lookup: string[] = []

        * [Warning logging:](#writer-warning-logging)
            * OAB_WRITER_WARN_LOOKUP_NOT_FOUND: boolean = false

        * [`storeData` options:](#writer-storedata-options)
            * OAB_WRITER_STORE_STRING_AS_NT: boolean = true
            * OAB_WRITER_STORE_FLOAT_AS_32: boolean = true

# Lookups

* Both `Reader` and `Writer` share an optional parameter: the lookup table, which has to be the same between the receiver and sender. It's purpose is for efficient storage of objects, so instead of writing the full key of the object as a string, we can just refer to the lookup table to make our task much more efficient.

## Example code

```js
const { Reader, Writer } = require("./index.js");

const writer_1 = new Writer({
    lookup: ["hello213213213213213213"]
});

writer_1.storeData({"hello213213213213213213": 123n});

console.log(writer_1.out().length); // 6

const writer_2 = new Writer();

writer_2.storeData({"hello213213213213213213": 123n});

console.log(writer_2.out().length); // 29

console.log(new Reader(writer_1.out(), {
    lookup: ["hello213213213213213213"]
}).getData()); // {"hello213213213213213213": 123n}

console.log(new Reader(writer_2.out()).getData()); // {"hello213213213213213213": 123n}
```

# Reader error handling

* Make sure to check out the [parameters of the `Reader` constructor](#reader-constructor) before reading this.

## GetData Unknown Index

* The way `Writer.storeData` works is that it puts a byte before the actual data is stored, to indicate to the receiver what type of data it is.

    * If `Reader.getData` does not find a value that is from these bytes, it checks whether `OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX` is set to true, and if it is, it throws an error.

    * Otherwise, it returns `undefined`.

## GetData Object Unknown Key

* Similarly, `Writer.storeData`'s object also puts a byte before storing the key of the object to indicate to the receiver what to do with the key of the object.

    * If `Reader.getData` does not find a value that is from these bytes, it checks whether `OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE` is set to true, and if it is, it throws an error.

    * Otherwise, the key is set to `undefined`.

## Length Out of Bounds

* The way `Writer.stringLN` and `Writer.storeData`'s array and object storing work is that they store the length of the data before the actual data. However, this means that a malicious sender could easily set the length to be extremely long and totally saturate your program.

    * If it is out of bounds and `OAB_READER_ERROR_ON_OOB` is set to true, an error is thrown.

    * Otherwise, it breaks out of the loop and returns the data.

        * Note that `Writer.storeData` is recursive and uses the same function to store array elements as it does regular data. This means that if this value is false, but `OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX` is true, it will still throw an error because the next value is undefined.

## Byte Out of Bounds

* If `Reader.byte` tries accessing out of bounds, then it means the sender is malicious.

    * If `OAB_READER_ERROR_ON_BYTE_OOB` is set to true, an error is thrown.

    * Otherwise, it returns 0n.

## StringNT Out of Bounds

* If `Reader.string` hits the end of the buffer before hitting `0`, that means that the sender is malicious.

    * If `OAB_READER_ERROR_ON_STRING_HIT_EOB` is set to true, an error is thrown.

    * Otherwise, it breaks out of the loop, as if it hit `0`.


## VU Out of Bounds

* The way `Reader.vu` works is that it checks if the most significant bit of the next byte is present, and if it is, that means the vu still has more data to read.

    * If the vu has more data to read and the reader hits the end of the buffer, that means the packet is malicious. It checks if `OAB_READER_ERROR_ON_VU_HIT_EOB` is present. If it is, an error is thrown.

    * Otherwise, it continues as normal.

## GetData Lookup Failed

* If `Reader.getData`'s object retrieving fails to get a lookup, that means that either the sender is malicious, or the lookup isn't properly shared on both the receiver and sender.

    * If `OAB_READER_ERROR_ON_OOB_LOOKUP` is set to true, an error is thrown.

    * Otherwise, it sets the key to `undefined`.

## Example code

```js
const { Reader, Writer } = require("./index.js");

const writer = new Writer();

writer.vu(150n);

const reader_1 = new Reader(writer.out(), {
    OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX: true
});

try
{
    console.log(reader_1.getData());
}
catch(err)
{
    console.log(err); // Error: Unexpected index! Got 150n
}

const reader_2 = new Reader(writer.out());

console.log(reader_2.getData()); // undefined
```

# Writer warning logging

* Make sure to check out the [parameters of the `Writer` constructor](#writer-constructor) before reading this.

## StoreData Lookup not Found

* If the Writer fails to find a value of an object's key in the lookup table, and `OAB_WRITER_WARN_LOOKUP_NOT_FOUND` is true, a warning is logged.
    * The key is set as a string, regardless of whether or not a warning was logged.

    * This can be useful if you want to see which keys you missed.

## Example code

```js
const { Reader, Writer } = require("./index.js");

const writer = new Writer({
    OAB_WRITER_WARN_LOOKUP_NOT_FOUND: false,
});

writer.storeData({hello: "hi"}); // No warning pops up in console

writer.OAB_WRITER_WARN_LOOKUP_NOT_FOUND = true;

writer.storeData({hello: "hi"}); // Warning pops up: Found a key that wasn't in the lookup table! hello.

writer.OAB_WRITER_WARN_LOOKUP_NOT_FOUND = false;

writer.storeData({hello: "hi"}); // No warning pops up in console
```

# Writer storeData options

* Make sure to check out the [parameters of the `Writer` constructor](#writer-constructor) before reading this.

* There are multiple ways to store data. The Writer provides options for users to pick from.

    * Setting `OAB_WRITER_STORE_STRING_AS_NT` to true means that all strings (including keys for objects) will be stored as Null Terminated Strings.

        * Otherwise, they will be stored as Length Based Strings.

    * Setting `OAB_WRITER_STORE_FLOAT_AS_32` to true means that all floats and integers will be stored as 32 bit numbers. This is more space efficient. However, it is less precise and your range of numbers is quite low.

        * Otherwise, they will be stored as 64 bit numbers, which are way larger, but more precise, and increase your range of numbers.

# Documentation

## Types:
* `Lookup`: `string[]`
    * Just an array of strings

* `OABDATA`: `number`, `bigint`, `string`, `OABDATA[]`, `{[key: string]: OABDATA}`, `boolean`, `null`, `undefined`
    * Integers
    * Floats
    * `+Infinity`
    * `-Infinity`
    * BigInts
    * Strings
    * Arrays of OABDATA
    * Objects of OABDATA
    * Booleans (`true` or `false`)
    * `null`
    * `undefined`
    * `NaN`

## Reader documentation:
* `constructor(content: Uint8Array, options?: { ... })`
    * [Previously explained](#reader-constructor)

* Error properties
    * `public Reader.OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE: boolean`
    * `public Reader.OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX: boolean`
    * `public Reader.OAB_READER_ERROR_ON_OOB: boolean`
    * `public Reader.OAB_READER_ERROR_ON_BYTE_OOB: boolean`
    * `public Reader.OAB_READER_ERROR_ON_STRING_HIT_EOB: boolean`
    * `public Reader.OAB_READER_ERROR_ON_VU_HIT_EOB: boolean`
    * `public Reader.OAB_READER_ERROR_ON_OOB_LOOKUP: boolean`

    * [Previously explained](#reader-error-handling).

* Property `public Reader.lookup: Lookup`
    * The lookup tables for the reader.

* Property `public Reader.at: number`
    * The current index that the reader is reading from the buffer.

* Property `private Reader._length`
    * The length of the buffer. Shouldn't be modified by yourself.

* Property `private Reader._buffer`
    * The buffer itself. Shouldn't be modified by yourself.

* Getter `public get buffer(): Uint8Array`
    * Returns `Reader._buffer`

* Setter `public set buffer(newBuf: Uint8Array)`
    * You can set the reader's buffer with this function. It also updates the `Reader._length`.

* Getter `public get length(): number`
    * You can get the length of the buffer with this function.

* Function `public Reader.rest(): Uint8Array`
    * Get the rest of the reader data after this.at.

* Function `public Reader.byte(): bigint`
    * Get the next byte of the buffer.

* Function `public Reader.vu(): bigint`
    * Get the next variable-length unsigned integer.
        * Variable length means it grows as needed, the bigger your number, the more data it takes, and so on.

* Function `public Reader.vi(): bigint`
    * Get the next variable-length signed integer.

* Function `public Reader.string(): string`reader
    * Null terminated string. It keeps reading until it hits either the end of the buffer, or `0x00`
        * As mentioned before, if a null character is present anywhere in the string, this totally breaks down.

* Function `public Reader.stringLN(): string`
    * Length based string.
        * You can store null characters with this.

* Function `public Reader.getData(): OABDATA`
    * Main way of retreiving data.

## Writer documentation:
* `constructor(options: { ... })`
    * [Previously explained](#writer-constructor)

* Warning properties
    * `public Writer.OAB_WRITER_WARN_LOOKUP_NOT_FOUND: boolean`

    * [Previously explained](#writer-warning-logging).

* `storeData` options
    * `public Writer.OAB_WRITER_STORE_STRING_AS_NT: boolean`
    * `public Writer.OAB_WRITER_STORE_FLOAT_AS_32: boolean`

    * [Previously explained](#writer-storedata-options)

* Property `public Writer.lookup: Lookup`
    * The lookup tables for the writer.

* Property `private Writer._at: number`
    * The index of the writer. Shouldn't be modified by yourself.

* Property `private Writer._buffer: number[]`
    * The buffer itself (but for now, it's in Array form, due to the nature of Uint8Arrays not being dynamic)

* Getter `public get at(): number`
    * Returns `Reader._at`

* Getter `public get buffer(): number[]`
    * Returns `Reader._buffer`

* Function `public Writer.out(): Uint8Array`
    * Returns the buffer as a Uint8Array

* Function `public Writer.flush(): Uint8Array`
    * Returns the buffer as a Uint8Array and sets `_buffer` to an empty array and `_at` to 0.

* Function `public Writer.byte(num: bigint): Writer`
    * Stores a bigint as a single byte (0 -> 255).
        * If the bigint is larger, it is simply clamped to 255.
    * Returns `this`.

* Function `public Writer.vu(num: bigint): Writer`
    * Stores a *POSITIVE* bigint as a variable length unsigned integer.
        * If the bigint is negative, an error is thrown.
    * Returns `this`.

* Function `public Writer.vi(num: bigint): Writer`
    * Stores a bigint as a variable length signed integer.
        * This does use up one more bit to store the sign.
    * Returns `this`.

* Function `public Writer.string(str: string): Writer`
    * Stores a string as a null terminated string.
        * Attempting to store a string with a null character breaks this. Be careful!
    * Returns `this`.

* Function `public Writer.stringLN(str: string): Writer`
    * Stores a string as well as the length of the string.
        * You can store null characters wit this.
    * Returns `this`.

* Function `public storeData(val: OABDATA): Writer`
    * Accepts the following as `val`:
        * Numbers
        * Floats
        * +/- Infinity
        * BigInts
        * Arrays of OABDATA
        * Objects of OABDATA
        * Booleans (`true` or `false`)
        * `null`
        * `undefined`
    * Returns `this`.
