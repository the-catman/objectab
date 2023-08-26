# OAB

* ObjectAB or OAB stands for Object to ArrayBuffer.

# Version list

* The versions below `v1.2.0` are all **deprecated, unsafe and dangerous**. DO NOT USE THEM!

* Major updates:

    * `v1.0.0`: Library created.
 
    * `v1.1.0`: Actually put error and out of bounds checking and handling. Updated documentation.

    * `v1.2.0`: Better error checking. Updated the name of the error/warning options in Reader and Writer to be much better. (This means you have to update your code if you use these variables). Added support for +/- Infinity. Updated documentation.

    * `v1.3.0`: Added floats, moved optional parameter of `storeData` to the constructor. Updated documentation.

* Minor updates (not permanent list):

    * `v1.3.6`: Added compilation to ES module.

# Installation

```bash
npm install typescript
```

# Why do you have a seperate README for npm and github?

* The reason is simple. Whenever I need to make some minor changes to documentation, I don't want to publish it to npm every single time. It's too much of a hassle for most users to update, and it's too much of a hassle to make a new version every single time.

# What is this library?

* This is a library for converting some javascript objects into a Uint8Array.

    * However, I didn't originally come up with the idea of doing this.

# So is it JSON?

* Not really. JSON is way more versatile, readable, less buggy, and less prone to errors.
    * However, it is quite slow and the output is very large.

* JSON is also not natively a text to bytecode encoder.
    * This means that you have to use something like `TextEncoder` to transform the JSON output to a Uint8Array, which is, again, quite slow.

# Is it efficient?

* It probably is way more efficient than JSON.

# Is it reliable?

* I have tested this, and it most likely is reliable.

    * If you do find an edge case that breaks this, please, by all means, open up a ticket. I'll try and solve the issue ASAP.

# Is it buggy?

* Given the extremely sensitive nature of this, yes.

    * If even one byte is malformed, there is a very high possibility of this breaking.

# Are there any things I should know before using this?

* One of the most important things is the lookup, if you're storing objects.

    * The lookup has to be ***exactly*** the same on both the sender and receiver.

* You can only retrieve objects in the same order as you stored them.

* You *can* (but really shouldn't) store Integers. Just convert it to bigint.

    * Integers and Floats take up a lot of space, as seen [here](#storedata-number).

# Example

* The code below is in javascript, however, porting to typescript is way better, faster, and easier.

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

// As I previously said, this library mainly supports bigints.
// This is a byte, 0 -> 255. Pretty simple.
// Attempting to store above this value will just clamp it to 255.
writer.byte(123n);
// "wHY dOeS A bYTE HAvE TO TaKE A BIgiNt". Well, if you don't like it, fix it in your version.

// This is a variable length unsigned integer (uses the LEB128 algorithm). The larger the integer is, the larger the output.
// Can store from 0 -> as big as bigints and Uint8Arrays can get???
// Attempting to store a negative number will throw an error.
writer.vu(1093021321n);

// This is a variable length signed integer. 
// You can store negative numbers with this. It's just uses 1 extra bit to store the sign
writer.vi(-123032321n);

// This is a float. It's extremely space demanding, and not all that accurate (unless you use float64 which is even more space demanding, but provides more accuracy)
// If you can, avoid this. Otherwise, you can use it no problem.
writer.float32(0.123892183);

// This is a null terminated string (aka NT string in my terminology).
// This is an okay way of storing data, but trying to include a null character anywhere in the string breaks it.
writer.string("Hello!");

// This is a length-based string (aka LN string in my terminology).
// Before the string data, it appends the string's length.
// It doesn't that that much more space compared to a null terminated string for shorter strings.
// If your string is 127 length, then this takes exactly the same amount of space as NT strings.
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

* This library can store the following:

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

* Note that if your object has a number as a key, it will get converted to a string. This is a limitation of javascript, not the library.

    * See [this](https://stackoverflow.com/questions/3633362/is-there-any-way-to-use-a-numeric-type-as-an-object-key) and [this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys).

    * Example:
        ```js
        let obj = {1: "hello"};

        console.log(obj); // { '1': 'hello' }

        console.log(Object.keys(obj)); // ['1']

        ```

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.storeData([1n, 2n, 3n, [{hello: 123n}, "hello hello 1234"]]);

const reader = new Reader(writer.out());

console.log(reader.getData()); // [1n, 2n, 3n, [{hello: 123n}, "hello hello 1234"]]

```

# Reader constructor

* `Reader constructor(content: Uint8Array, options?: { ... })`
    * The reader needs a buffer as a non-optional parameter. The Buffer is a Uint8Array.

    * The `Reader` may have the following for `options`:
        * [Lookups:](#the-lookup)
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
        * [Lookups:](#the-lookup)
            * lookup: string[] = []

        * [Warning logging:](#writer-warning-logging)
            * OAB_WRITER_WARN_LOOKUP_NOT_FOUND: boolean = false

        * [`storeData` options:](#writer-storedata-options)
            * OAB_WRITER_STORE_STRING_AS_NT: boolean = true
            * OAB_WRITER_STORE_FLOAT_AS_32: boolean = true

# The lookup

* Both `Reader` and `Writer` share an optional parameter: the lookup table, which has to be the same between the receiver and sender.

    * It's purpose is for efficient storage of objects, so instead of writing the full key of the object as a string, we can just refer to the lookup table to make our task much more efficient.

Example code:

```js
const { Reader, Writer } = require("objectab");

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

Make sure to check out the [parameters of the `Reader` constructor](#reader-constructor) before reading this.

* The way `Writer.storeData` works is that it puts a byte before the actual data is stored, to indicate to the receiver what type of data it is.

    * If `Reader.getData` does not find a value that is from these bytes, it checks whether `OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX` is set to true, and if it is, it throws an error.

    * Otherwise, it returns `undefined`.

* Similarly, `Writer.storeData`'s object also puts a byte before storing the key of the object to indicate to the receiver what to do with the key of the object.

    * If `Reader.getData` does not find a value that is from these bytes, it checks whether `OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE` is set to true, and if it is, it throws an error.

    * Otherwise, the key is set to `undefined`.

* The way `Reader.stringLN` and `Reader.storeData`'s array and object storing works is that it stores the length of the data before the actual data. However, this means that a malicious sender could easily set the length to be extremely long and totally saturate your program.

    * If it is out of bounds and `OAB_READER_ERROR_ON_OOB` is set to true, an error is thrown.

    * Otherwise, it breaks out of the loop and returns the data.

        * Note that `Writer.storeData` is recursive and uses the same function to store array elements as it does regular data. This means that if this value is false, but `OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX` is true, it will still throw an error because the next value is undefined.

* If `Reader.byte` tries accessing out of bounds, then it means the sender is malicious.

    * If `OAB_READER_ERROR_ON_BYTE_OOB` is set to true, an error is thrown.

    * Otherwise, it returns 0n.

* If `Reader.string` hits the end of the buffer before hitting `0`, that means that the sender is malicious.
    * If `OAB_READER_ERROR_ON_STRING_HIT_EOB` is set to true, an error is thrown.

    * Otherwise, it breaks out of the loop, as if it hit `0`.

* The way `Reader.vu` works is that it checks if the most significant bit of the next byte is present, and if it is, that means the vu still has more data to read.
    * If the vu has more data to read and the reader hits the end of the buffer, that means the packet is malicious. It checks if `OAB_READER_ERROR_ON_VU_HIT_EOB` is present. If it is, an error is thrown.

    * Otherwise, it continues as normal.

* If `Reader.getData`'s object retrieving fails to get a lookup, that means that either the sender is malicious, or the lookup isn't properly shared on both the receiver and sender.
    * If `OAB_READER_ERROR_ON_OOB_LOOKUP` is set to true, an error is thrown.

    * Otherwise, it sets the key to `undefined`.

Example code:

```js
const { Reader, Writer } = require("objectab");

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

* If the Writer fails to find a value of an object's key in the lookup table, and `OAB_WRITER_WARN_LOOKUP_NOT_FOUND` is true, a warning is logged.
    * The key is set as a string, regardless of whether or not a warning was logged.

    * This can be useful if you want to see which keys you missed.

Example code:

```js
const { Reader, Writer } = require("objectab");

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

* Types:
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

* Reader documentation:
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

* Writer documentation:
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


# Packet structure

* We have discussed the documentation, however, one thing that hasn't been discussed in detail is the packet structure - arguably the most important part of the library.

* If you're curious on how this library works, then read this.
    * Otherwise, [skip it](#to-do-list).

* The library is based around the `Uint8Array` class. In javascript, this is a non-dynamic (i.e. length is specified when calling the constructor), unsigned 8 bit integer array.
    * This means that it can't grow as you wish, and the length is constant. It also means the numbers that are supported are from 0 -> 255. In hexadecimal, 0x00 -> 0xff. In binary, 0b0 -> 0b11111111.
        * Unsigned simply means that the numbers do not have a sign - they're always positive.
        * 8 bit means that the largest value that each index can hold is 8 bits.
    * This seriously limits our options for size. We cannot simply say:

    ```js
    let buf = new Uint8Array([256620341]);

    console.log(buf[0]); // 53

    // 53 === 256620341 & 255

    ```

Fortunately, we can use clever tricks to work around this restriction...

# Data type: byte

* Starting off, the most obvious data type is a single byte, or 8 bits.

* Since Uint8Arrays can support up to 8 bits for each index, that means we can store up to 8 bits (11111111 in binary, 255 in decimal) without any problems.

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.byte(255n);

console.log(writer.out()); /* Uint8Array(1) [ 255 ]
There's our number!
*/

const reader = new Reader(writer.out());

console.log(reader.byte()); // 255n

```

* However, what if we wanted to store more than that?

# Data type: vu (or variable length unsigned integer)

* You can read in depth about `vu` (in reality, LEB128) [here](https://en.wikipedia.org/wiki/LEB128).

* This is quite an interesting datatype. The way it works is that it stores 7 bits of the number at a time, and the [most significant bit](https://en.wikipedia.org/wiki/Bit_numbering) indicates whether or not there's more data coming.

* So, for example, to store the number 1921, which is 11110000001 in binary.
    * First, we take the least 7 significant bits (0000001). Then we check whether or not there's more data we need to store.
        * Indeed, there is still 4 bits we need to store, so we add an 8th bit with the value as `1` (10000001), indicating that there's still more data to be read.
    * Then we store this number (10000001 in binary or 129 in decimal). This is perfectly fine, since for each index of the Uint8Array, we can store up to 8 bits (or 255 in decimal).
    * Now, back to the original number (11110000001). Since we took the least 7 significant bits, we can scrap those and we get 1111.
    * Then we check whether or not there's more data we need to store.
        * Indeed, there is no more data to store after this. So we simply store this number (1111 in binary, 15 in decimal) as it is, without appending anything.

* Now, we have a Uint8Array with index 0 as 129 and index 1 as 15.

* To retrieve the original integer, it's very simple.
    * We take the first value (10000001 in binary, 129 in decimal), and look at the 8th bit.
        * It is `1`, that means that we still have more data to read.
    * Then, we take the least 7 significant bits (0000001) and append it to a counter.
    * Next, we look at the second value (00001111 in binary, 15 in decimal), since we had more data to read.
        * We look at the 8th bit, and it is 0, that means we have reached the end of our `vu`.
            * Then, we take the least 7 significant bits (0001111) and **append** (not add) it to the counter.
    * Now, our counter is 00011110000001. We scrap the zeros at the end, so now our number is 11110000001, which matches with our original number.

Example code:

```js

const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.vu(1921n);

console.log(writer.out()); // Uint8Array(2) [ 129, 15 ]

const reader = new Reader(writer.out());

console.log(reader.vu()); // 1921n

```

* However, what if we wanted to store a negative number, or a number that we're not sure of the sign?

# Data type: vi (or variable length signed integer)

* Let's say we have the number -1921. We note the sign (it's minus), and we take the absolute value of the number (basically scrap the negative sign, and we get 1921).
    * Next, let's take a look at 1921 in binary. It's 11110000001. We add an additional bit at the beginning of this, which corresponds to the sign. If it's `1`, that means our number is negative. If it's `0`, it means our number is positive.
        * Since our original number was negative, we push `1` to this, so now our number becomes 111100000011. You can see that this uses up an extra bit to store the sign.
    * Next, we simply encode this number as a vu.

* To retrieve the original integer, it's, again, very simple.
    * We decode the vu and get 111100000011. Next, we look at the least significant bit.
    * It is `1`, which means our number is negative.
    * Then we simply scrap the least significant bit, and get 11110000001.
    * Since our least significant bit was `1`, our number is negative, so that means our number is -11110000001 in binary or -1921 in decimal.

Example code:

```js

const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.vi(-1921n);

console.log(writer.out()); // [131, 30]

const reader = new Reader(writer.out());

console.log(reader.vi()); // -1921n

```

* However, what if we wanted to encode a string?

# String encoding: 2 types

We have 2 ways to do this: Both are very easy.

# Data type: Null terminated strings

* We takes each character of a string and encodes gets its character code (which is a number). Then we encode the character code as a vu.
    * We continue encoding until the writer reaches the end of the string.
    * When it does, it puts a `0`.

* To retrieve the original string, we start decoding each character's vu, then get the character associated with the character code. We append this to a variable.
    * We continue decoding and appending until the reader hits a `0`. Then, it stops.

Example code:

```js

const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.string("hi");

console.log(writer.out()); // [104, 105, 0]

const reader = new Reader(writer.out());

console.log(reader.string()); // "hi"

```

* However, what if you want to encode a string that has a null character?

# Data type: Length based strings

* This is a similar version of the previous encoding method.
    * Instead of appending a null character to indicate that the string has ended, we simply store the length of the string as a vu before encoding the actual string itself.

* To retrieve the original string, we read a vu (to read the length of the string), and we start decoding each character's vu, until we know the string finishes.

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.stringLN("hi");

console.log(writer.out()); // [2, 104, 105]

const reader = new Reader(writer.out());

console.log(reader.stringLN()); // "hi"

```

* However, how do we store objects?

# Functions: storeData/getData

* The most important functions in this library, which enables us to store objects.
    * When a value is passed to storeData to encode, the first thing we have to do is check what type of data it is. Is it an integer, a string, an object?
    * Then, according to the data type, we append a byte. This byte tells the reader what data type it is (so it knows how to process the data).

Currently supported data types are:

# storeData: String

* When a storeData encounters a string, it checks whether or not [`OAB_WRITER_STORE_STRING_AS_NT`](#writer-constructor) is true.
    * If it is, storeData appends `0` to the buffer and then calls `Writer.string`.
    * Otherwise, storeData appends `9` to the buffer and then calls `Writer.stringLN`.

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer({
    OAB_WRITER_STORE_STRING_AS_NT: true
});

writer.storeData("hello");

writer.OAB_WRITER_STORE_STRING_AS_NT = false;

writer.storeData("hello");

console.log(writer.out()); /* Uint8Array(14) [ 0, 104, 101, 108, 108, 111, 0, 9, 5, 104, 101, 108, 108, 111, 0 ]
0 indicates a null terminated string.
104, 101, 108, 108, and 111 are character codes for "h", "e", "l", "l", and "o" respectively, encoded as a vu.
0 indicates the end of the string.

9 indicates a length based string
5 indicates the length of the string
104, 101, 108, 108, and 111 are character codes for "h", "e", "l", "l", and "o" respectively, encoded as a vu.

*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // hello
console.log(reader.getData()); // hello

```

# storeData: BigInt

* When storeData encounters a bigint, it checks whether or not the bigint is positive or negative.
    * If it's positive bigint, storeData appends `10` to the buffer and then calls `Writer.vu` on the number.
    * If it's a negative bigint, storeData appends `1` to the buffer and then calls `Writer.vu` on the positive version of the number.

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.storeData(42n).storeData(-49n);

console.log(writer.out()); /* Uint8Array(4) [ 10, 42, 1, 49 ]
10 indicates a positive bigint
42 is the data of the bigint, encoded as a vu

1 indicates a negative bigint
49 is the data of the bigint, encoded as a vu
*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // 42n
console.log(reader.getData()); // -49n

```

* Why don't we use vi?

    * Well, since we already have to use a byte to store the data type, we might as well just use that same byte to denote whether or not the integer is positive or negative. No need to use pointless indicators!

# storeData: boolean

* When storeData encounters a boolean (`true` or `false`) value, it appends `5` if the value is true, and it appends `6` if the value is false.

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.storeData(true).storeData(false);

console.log(writer.out()); /* Uint8Array(1) [ 5, 6 ]
5 and 6 indicate true and false respectively
*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // true
console.log(reader.getData()); // false

```

# storeData: Integer/Float

* When storeData encounters an Integer or a Float, it checks whether [`OAB_WRITER_STORE_FLOAT_AS_32`](#writer-constructor) is set to true.
    * If it is, it appends `13`. Then, it uses an ArrayBuffer to converse between a Float32Array and a BigUint64Array, essentially allowing us to convert the Float to a BigInt. Then, it stores the bigint as a vu.
    * Otherwise, it appends `14`. Then, it uses an ArrayBuffer to converse between a Float64Array and a BigUint64Array, and convert it to a BigInt. Then, it stores the bigint as a vu.
    
    * Both these methods are quite intensive on space, so use them with care.
        * Storing it as 64 bits is way more intensive, so do be careful!

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer({
    OAB_WRITER_STORE_FLOAT_AS_32: true
});

writer.storeData(0.123892183);

console.log(writer.out()); // Uint8Array(6) [ 13, 175, 246, 246, 239, 3 ]
// 5 bytes used for storing float. It's not too awful. However...

const reader = new Reader(writer.out());

console.log(reader.getData()); // 0.12389218062162399
// You can see that it is quite inaccurate

writer.OAB_WRITER_STORE_FLOAT_AS_32 = false;

writer.flush(); // Flush the buffer

writer.storeData(0.123892183);

reader.buffer = writer.out(); // Change the reader's buffer
reader.at = 0; // Start reading from the beginning

console.log(writer.out()); // Uint8Array(10) [ 14, 213, 154, 220, 209, 222, 236, 237, 223, 63 ]
// 9 bytes for storing float?! That is quite a lot! However...

console.log(reader.getData()); // 0.123892183
// You can see that it's quite accurate

```

# storeData: NaN (or Not a Number)

* When storeData encounters NaN, it appends `2`.

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.storeData(NaN);

console.log(writer.out()); /* Uint8Array(1) [ 2 ]
2 indicates NaN
*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // NaN

```

# storeData: +Infinity

* When storeData encounters Infinity, it appends `11`.

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.storeData(Infinity);

console.log(writer.out()); /* Uint8Array(1) [ 11 ]
11 indicates Infinity
*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // Infinity

```

# storeData: -Infinity

* When storeData encounters -Infinity, it appends `12`.

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.storeData(-Infinity);

console.log(writer.out()); /* Uint8Array(1) [ 12 ]
12 indicates -Infinity
*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // -Infinity

```

# storeData: undefined

* When storeData encounters `undefined`, it appends `7`.

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.storeData(undefined);

console.log(writer.out()); /* Uint8Array(1) [ 7 ]
7 indicates undefined
*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // undefined

```

# storeData: null

* When storeData encounters `null`, it appends `8`.

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.storeData(null);

console.log(writer.out()); /* Uint8Array(1) [ 8 ]
8 indicates null
*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // null

```

# storeData: Arrays

* When storeData encounters an array, it appends `3` and calls `Writer.vu` with the length of the array. Then, it calls `Writer.storeData` on each of the elements to store them.
    * This means that it is possible to store multi-dimensional arrays.

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.storeData([2n, [4n]]);

console.log(writer.out()); /* Uint8Array(8) [ 3, 2, 10, 2, 3, 1, 10, 4 ]
3 indicates the array data type
2 indicates the length of the array

    10 indicates the bigint data type
    2 is the value of the bigint (as a vu)

    3 indicates the array data type
    1 indicates the length of the array

        10 indicates the bigint data type
        4 is the value of the bigint (as a vu)
*/
const reader = new Reader(writer.out());

console.log(reader.getData());

```

# storeData: Objects

* When storeData encounters an object, it appends `4` and calls `Writer.vu` with the length of the object's keys.
    * Next, it loops through the keys of the object, and it checks whether the key is found in the lookup table or not.
        * The lookup table is basically a giant array of strings.
        * If it does find the lookup, it appends a `0` to tell the reader that we found a key, and stores the number we found
            * Otherwise, it checks whether [`OAB_WRITER_STORE_STRING_AS_NT`](#writer-constructor) is true:
                * If it is, it appends a `1` to tell the reader that we didn't find a lookup, so we're storing the key as a null terminated string.
                * Otherwise, it appends a `2` to tell the reader that we didn't find a lookup, so we're storing the key as a length based string.
    * Then it calls `Writer.storeData` to store the value of the key.
        * This means that it is possible to store multi-dimensional objects.

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer({
    lookup: ["hello"]
});

writer.storeData({hello: {
    hi: 1n
}})

console.log(writer.out()); /* Uint8Array(12) [ 4, 1, 0, 0, 4, 1, 1, 104, 105, 0, 10, 1 ]
4 indicates an object.
1 indicates that there's 1 key/pair to this object.

    Next, we need to get the key.
    0 indicates that a key is found in the lookup table
    0 indicates that it's the 1st element of the lookup table

    The reader looks that up and goes "yeah alright, I have the 0th element of the lookup, it's called "hello", let me put it in!"
    
    It's time to get the value of the key
        4 indicates an object
        1 indicates that there's 1 key/pair to this object.

            Next we need to get the key.
            1 indicates that the key is not found in the lookup table, and that it's stored as a null terminated string.
            104, and 105 are character codes for "h", and "i" respectively, encoded as a vu
            0 indicates the end of the string

            It's time to get the value of the jey
                10 indicates a positive bigint
                1 is the value of the bigint, encoded as a vu
*/

const reader = new Reader(writer.out(), {
    lookup: ["hello"]
});

console.log(reader.getData()); // { hello: { hi: 1n } }

```

# Do have a look at the code yourself

* I can sit here and explain this library all day. However, if you're still curious, do actually take a look at [the code](/index.ts) yourself.
    * I tried to make it as readable as possible, however it is slightly spaghetti.

# To-do list

There are still lots of features to implement for this library, such as:

* Better documentation
* More checks for error handling

And many more!

# Pull requests and issues

Pull requests and issues are welcome. Changing this to make your own version is welcome. Suggestions are welcome. Bug reports are welcome and recommended!