# OAB

ObjectAB or OAB stands for Object to ArrayBuffer.

THE VERSION v1.0.x IS DEPRECATED, UNSAFE AND DANGEROUS! DO NOT USE!

# New stuff

* Major updates:

    * v1.0.x: Library created

    * v1.1.x: Actually put error and out of bounds checking and handling.

    * v1.2.x: Better error checking, and updated documentation. Updated the name of the error/warning options in Reader and Writer to be much better. (This means you have to update your code if you use these variables). Added support for +/- Infinity.

* Minor updates (not permanent list):
    * v1.2.1: Small changes to lookup in the background. Changed Writer and Reader optional parameter `lookupJSON` to `lookup`. Added an error logging option `OAB_READER_ERROR_ON_OOB_LOOKUP`.

# What is this library?

This is a library for converting some javascript objects into a Uint8Array.

However, I didn't originally come up with this.

# So is it JSON?

Not really. JSON is way more versatile, less buggy and less prone to errors. However, it is quite slow and the output is very large.

It is also not natively a bytecode encoder, so you have to use something like `TextEncoder` to transform the JSON output to a Uint8Array, which is even slower.

# Is it efficient?

It probably is way more efficient than JSON.

# Is it reliable?

I have tested this, and it most likely is reliable.

If you do find an edge case that breaks this, please, by all means, open up a ticket. I'll try and solve the issue ASAP.

# Is it buggy?

Given the extremely sensitive nature of this, ***yes***.

If even one byte is malformed, there is a very high possibility of this breaking.

# Are there any things I should know before using this?

I have covered most things you should know beforehand.

However, one of the most important things is the lookup, if you're storing objects.

The lookup has to be ***exactly*** the same on both the sender and receiver.

Another thing is that you can only retrieve objects in the same order as you stored them.

You *can* (but really shouldn't) store Integers with the `storeData` function.

This library mainly uses BigInts, meaning other functions do not support Integers.

If you attempt to forcefully store integers outsite of `storeData`, I don't know what will happen (nor do I care, since I haven't tested what would happen if ambitious programmers decided to break my library).

Floats are totally not supported, due to the nature of bigints and this library.

# Great! Where is the code?

The below is javascript code, however, porting to typescript is way better. Definitely do use typescript to avoid unintentional errors.

```js
const { Reader, Writer } = require("objectab");

// Let's start out with basic data types, then we can move to more complex ones.

const writer = new Writer();

// As I previously said, this library mainly supports bigints.
// This is a byte, 0-255. Pretty simple.
// Attempting to store above this value will just clamp it to 255.
writer.byte(123n);
// "wHY dOeS A bYTE HAvE TO bE A BIgiNt". Well, if you don't like it, fix it in your version.

// This is a variable length unsigned integer (uses the LEB128 algorithm). The larger the integer is, the larger the output.
// Can store from 0 -> as big as BigInt is.
// Attempting to store a negative number will cause this to go into an infinite loop and crash, so... don't do that.
writer.vu(1093021321n);

// This is a variable length signed integer. Basically, this is vu but it stores the sign in the least significant bit,
// which means you can store negative numbers.
// If you don't know what that means, don't worry about it.
// You can store positive numbers, it's just not very space efficient since it uses 1 extra bit to store the sign
writer.vi(-123032321n);

// This is a null terminated string (NT string). This is an okay way of storing data, but trying to include a null character anywhere in the string breaks it.
writer.string("Hello!");

// This is a length-based string (LN string). Before the string data, it appends the string's length.
// The current version checks whether the reader is going out of bounds of the Uint8Array, and if it is, the loop is exited.
// Therefore, this is pretty safe.
writer.stringLN("Hello from LENGTH!");

// Writer.out() outputs the buffer as a Uint8Array
const reader = new Reader(writer.out());

console.log(reader.byte()); // 123n

console.log(reader.vu()); // 1093021321n

console.log(reader.vi()); // -123032321n

console.log(reader.string()); // "Hello!"

console.log(reader.stringLN()); // "Hello from LENGTH!"

```

Now to move onto why you're probably here: Object storing.

This library can store the following:

NaN

undefined

null

true

false

positive integers

negative integers

null terminated strings

length based strings

objects

arrays

If a value is passed that does not match one of these data types, an error is thrown. (This includes floats, which aren't supported in this library).

Note that if your object has a number as a key, it will get converted to a string. This is a limitation of javascript, not the library.

See [this](https://stackoverflow.com/questions/3633362/is-there-any-way-to-use-a-numeric-type-as-an-object-key) and [this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys).

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.storeData([1n, 2n, 3n, [{hello: 123n}, "hello hello 1234"]]);

const reader = new Reader(writer.out());

console.log(reader.getData()); // [1n, 2n, 3n, [{hello: 123n}, "hello hello 1234"]]

```

Also, `storeData` takes an optional boolean parameter called `storeStringAsNT`, defaulted to true.

As you can guess from the name, it determines whether or not all strings that are found in `storeData` should be stored as "Null Terminated" or "Length Based" strings.
    * Note that this also applies to storing object keys.

# Optional parameters

Both `Reader` and `Writer` take an object (called options) as an optional parameter.

The `Reader` may have the following for optional parameters:
* lookup: string[] = []
* OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX: boolean = false
* OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE: boolean = false
* OAB_READER_ERROR_ON_OOB: boolean = false
* OAB_READER_ERROR_ON_BYTE_OOB: boolean = false
* OAB_READER_ERROR_ON_STRING_HIT_EOB: boolean = false
* OAB_READER_ERROR_ON_VU_HIT_EOB: boolean = false
* OAB_READER_ERROR_ON_OOB_LOOKUP: boolean = false

The `Writer` may have the following for optional parameters:
* lookup: string[] = []
* OAB_WRITER_WARN_LOOKUP_NOT_FOUND: boolean = false
* OAB_WRITER_WARN_INT_NOT_SUPP: boolean = false

# The lookup

Both `Reader` and `Writer` share an optional parameter: the lookup table, which has to be the same between the receiver and sender.

It is for objects, so instead of writing the full key of the object as a string, we can just refer to the lookup table to make our task much more efficient.

If `options.OAB_WRITER_WARN_LOOKUP_NOT_FOUND_SET` is set to true, then a warning will be shown when a Writer tries to write and the object's value is not found.

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

# Warning logging

Make sure to check out the [optional parameters](#optional-parameters) before reading this.

* If the Writer fails to find a value of an object's key in the lookup table, and `OAB_WRITER_WARN_LOOKUP_NOT_FOUND` is true, a warning is logged.
    * The key is set as a string, regardless of whether or not a warning was logged.
        * The type of string depends on the optional parameter `storeStringAsNT`, defaulted to true.

    * This can be useful if you want to see which keys you missed.

* If the Writer's `storeData` function is called and has an integer as a form of data, and `OAB_WRITER_WARN_INT_NOT_SUPP` is true, a warning is logged.
    * The integer gets converted to a bigint, regardless of whether or not a warning was logged.

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer({
    OAB_WRITER_WARN_LOOKUP_NOT_FOUND: false,
    OAB_WRITER_WARN_INT_NOT_SUPP: false
});

writer.storeData({hello: "hi"}); // No warning pops up in console
writer.storeData(1); // No warning pops up in console

writer.OAB_WRITER_WARN_LOOKUP_NOT_FOUND = true;
writer.OAB_WRITER_WARN_INT_NOT_SUPP = true;

writer.storeData({hello: "hi"}); // Warning pops up: Found a key that wasn't in the lookup table! hello.
writer.storeData(1); // Warning pops up: Warning: Regular integers are not supported. However, it was automatically converted to a bigint.

writer.OAB_WRITER_WARN_LOOKUP_NOT_FOUND = false;
writer.OAB_WRITER_WARN_INT_NOT_SUPP = false;

writer.storeData({hello: "hi"}); // No warning pops up in console
writer.storeData(1); // No warning pops up in console

```

# Error handling

Make sure to check out the [optional parameters](#optional-parameters) before reading this.

* The way `Writer.storeData` works is that it puts a byte before the actual data is stored, to indicate to the receiver what type of data it is. These values currently range from 0n to 10n.

    * If `Reader.getData` does not find a value that is from 0n to 10n, it checks whether `OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX` is set to true, and if it is, it throws an error.

    * Otherwise, it returns `undefined`.

* Similarly, `Writer.storeData`'s object also puts a byte before storing the key of the object to indicate to the receiver what to do with the key of the object. These values currently are 0n and 1n.

    * If `Reader.getData` does not find a value that is either 0n or 1n, it checks whether `OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE` is set to true, and if it is, it throws an error.

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

writer.vu(11n); // `storeData`'s indexes are only from 0n -> 10n

const reader_1 = new Reader(writer.out(), {
    OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX: true
});

try
{
    console.log(reader_1.getData());
}
catch(err)
{
    console.log(err); // Error: Unexpected index! Expected 0n, 1n, 2n... 10n, instead got 11
}

const reader_2 = new Reader(writer.out());

console.log(reader_2.getData()); // undefined

```

# Actual documentation

* Types:
    * `RegularLookup`: `string[]`
        * Just an array of strings
    
    * `Lookup`: `{[key: number]: string}`
        * An object with a key as a number and a value as a string.
    
    * `ReverseLookup`: `{[key: string]: string}`
        * An object with a key as a string and a value as a string.
    
    * `OABDATA`: `number`, `bigint`, `string`, `OABDATA[]`, `{[key: string]: OABDATA}`, `boolean`, `null`, `undefined`
        * Since typescript doesn't have an actual type for `NaN`, I was forced to include the `number` data type.
        * BigInts
        * Strings
        * Arrays of OABDATA
        * Objects of OABDATA
        * Booleans (`true` or `false`)
        * `null`
        * `undefined`

* Reader documentation:
    * `constructor(content: Uint8Array, options?: Options)`
        * The optional parameter `options` has been [previously explained](#optional-parameters).

    * Error properties
        * `public Reader.OAB_READER_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE: boolean`
        * `public Reader.OAB_READER_ERROR_ON_GETDATA_UNKNOWN_INDEX: boolean`
        * `public Reader.OAB_READER_ERROR_ON_OOB: boolean`
        * `public Reader.OAB_READER_ERROR_ON_BYTE_OOB: boolean`
        * `public Reader.OAB_READER_ERROR_ON_STRING_HIT_EOB: boolean`
        * `public Reader.OAB_READER_ERROR_ON_VU_HIT_EOB: boolean`
        * `public Reader.OAB_READER_ERROR_ON_OOB_LOOKUP: boolean`

        * These have been [previously explained](#error-handling).

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

    * Function `public Reader.string(): string`
        * Null terminated string. It keeps reading until it hits either the end of the buffer, or `0x00`
            * As mentioned before, if a null character is present anywhere in the string, this totally breaks down.
    
    * Function `public Reader.stringLN(): string`
        * Length based string.
            * You can store null characters with this.
    
    * Function `public Reader.getData(): OABDATA`
        * May return the following:
            * String
            * Positive and Negative BigInts
            * `NaN`
            * Arrays of OABDATA
            * Objects of OABDATA. Keys must be as strings, due to the nature of javascript.
            * `undefined`
            * `null`
            * Despite the fact that OABDATA has the `number` data type as well, this is merely for `NaN`, `Reader.getData` never returns an integer.

* Writer documentation:
    * Warning properties
        * `public Writer.OAB_WRITER_WARN_LOOKUP_NOT_FOUND: boolean`
        * `public Writer.OAB_WRITER_WARN_INT_NOT_SUPP: boolean`

        * These have been [previously explained](#warning-logging).

    * Property `public Writer.lookupReverse: ReverseLookup`
        * The reversed lookup tables for the writer.

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
    
    * Function `public storeData(val: OABDATA, storeStringAsNT: boolean = true): Writer`
        * Accepts the following as `val`:
            * Numbers **(deprecated)**
            * BigInts
            * Arrays of OABDATA
            * Objects of OABDATA
            * Booleans (`true` or `false`)
            * `null`
            * `undefined`
        * `storeStringAsNT` is an optional parameter. It tells the code whether or not to store every string as a null terminated or length based string.
            * This also includes the strings for object's keys.
        * Returns `this`.


# Packet structure

We have discussed the documentation, however, one thing that hasn't been discussed in detail is the packet structure - arguably the most important part of the library.

If you're curious on how this library works, then read this. Otherwise, skip it.

The library is based around the `Uint8Array` class. In javascript, this is a non-dynamic (i.e. length is specified when calling the constructor), unsigned 8 bit integer array.

This means that it can't grow as you wish, and the length is constant. It also means the numbers that are supported are from 0 -> 255. In hexadecimal, 0x00 -> 0xff. In binary, 0b0 -> 0b11111111.

Unsigned simply means that the numbers do not have a sign - they're always positive.

8 bit means that the largest value that each index can hold is 8 bits.

This seriously limits our options for packet transfer. We cannot simply say:

```js
let buf = new Uint8Array([256620341]);

console.log(buf[0]); // 53, or 256620341 & 53.
```

Fortunately, we can use clever tricks to work around this restriction..

# Data type: byte

Starting off, the most obvious data type is a single byte, or 8 bits.

Since Uint8Arrays can support up to 8 bits for each index, that means we can store up to 8 bits (or 255 in decimal) without any problems.

However, what if we wanted to store more than that?

# Data type: vu (or variable length unsigned integer)

You can read in depth about `vu`s [here](https://en.wikipedia.org/wiki/LEB128).

This is quite an interesting datatype. The way it works is that it stores 7 bits of the number at a time, with the [most significant bit](https://en.wikipedia.org/wiki/Bit_numbering) indicating whether or not there's more data coming.

So, for example, to store the number 1921, which is 11110000001 in binary.

First, we take the least 7 significant bits (0000001). Then we check whether or not there's more data we need to store, and indeed, there is still 4 bits we need to store, so we add an 8th bit with the value as `1` (10000001), indicating that there's still more data to be read.

Then we store this number (10000001 in binary or 129 in decimal). This is perfectly fine, since for each index of the Uint8Array, we can store up to 8 bits (or 255 in decimal).

Now, back to the original number (11110000001). Since we took the least 7 significant bits, we can scrap those and we get 1111. Then we check whether or not there's more data we need to store, and indeed, there is no more data to store after this. So we simply store this number (1111 in binary, 15 in decimal) as it is, without appending anything.

Now, we have a Uint8Array with index 0 as 129 and index 1 as 15.

Now, to retrieve the original integer, it's very simple.

We take the first value (10000001 in binary, 129 in decimal), and look at the 8th bit. It is `1`, that means that we still have more data to read.
Then, we take the least 7 significant bits (0000001) and append it to a counter.

Next, we look at the second value (00001111 in binary, 15 in decimal), since we had more data to read. We look at the 8th bit, and it is 0, that means we have reached the end of our `vu`. Then, we take the least 7 significant bits (0001111) and append it to the counter.

Now, our counter is 00011110000001. We scrap the zeros at the end, so now our number is 11110000001, which matches with our original number.

Example code:

```js

const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.vu(1921n);

console.log(writer.out()); // Uint8Array(2) [ 129, 15 ]

const reader = new Reader(writer.out());

console.log(reader.vu()); // 1921n

```

Quite fun, isn't it?

But what if we wanted to store a negative number, or a number that we're not sure of the sign?

# Data type: vi (or variable length signed integer)

Let's say we have the number -1921. We note the sign (it's minus), and we take the absolute value of the number (basically scrap the negative sign, and we get 1921).

Next, let's take a look at 1921 in binary. It's 11110000001. We add an additional bit at the beginning of this, which corresponds to the sign. If it's `1`, that means our number is negative. If it's `0`, it means our number is positive.

Since our original number was negative, we push `1` to this, so now our number becomes 111100000011. You can see that this uses up an extra bit to store the sign.

Next, we simply encode this number as a vu.

When we want to retrieve it, we decode the vu and get 111100000011. Next, we look at the least significant bit. It is `1`, which means our number is negative.

Then we simply remove the least significant bit, and get 11110000001.

Since our least significant bit was `1`, our number is negative, so that means our number is -11110000001 in binary or -1921 in decimal.

Example code:

```js

const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.vi(-1921n);

console.log(writer.out()); // [131, 30]

const reader = new Reader(writer.out());

console.log(reader.vi()); // -1921n

```

Amazing, right?

# String encoding: 2 types

Okay, that's very cool, but how can we encode a string?

We have 2 ways to do this: Both are very easy.

First, let's look at null terminated strings...

# Data type: Null terminated strings

Relatively straightforward. Takes each character of a string and encodes gets its character code (which is a number). Then it encodes the character code as a vu.

We continue encoding until the writer reaches the end of the string. When it does, it puts a `0`.

When parsing this, we decode each character's vu, then get the character associated with the character code. We append this to a variable.

We continue decoding and appending until the reader hits a `0`. Then, it stops.

Example code:

```js

const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.string("hi");

console.log(writer.out()); // [104, 105, 0]

const reader = new Reader(writer.out());

console.log(reader.string()); // "hi"

```

Okay, that's very nice, but what if you want to encode a string that has a null character? We cannot use this method, otherwise it simply breaks down.

# Data type: Length based strings

This is a similar version of the previous code, however, instead of appending a null character to indicate that the string has ended, we simply store the length of the string as a vu before encoding the actual string itself.

To decode, we read a vu (to read the length of the string), then simply use a for loop to read the string.

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.stringLN("hi");

console.log(writer.out()); // [2, 104, 105]

const reader = new Reader(writer.out());

console.log(reader.stringLN()); // "hi"

```

That's very cool. How do we store objects, though?

# Functions: storeData/getData

The most important functions in this library, which enables us to store objects.

When a value is passed to storeData to encode, the first thing we have to do is check what type of data it is. Is it an integer, a string, an object?

Then, according to the data type, we append a byte. This byte tells the reader what data type it is (so it knows how to process the data).

Currently supported data types are:

# storeData: String

When a storeData encounters a string, it checks whether or not the optional parameter `storeStringAsNT` is true.

If it is, storeData appends `0` to the buffer and then calls `Writer.string`.

Otherwise, storeData appends `9` to the buffer and then calls `Writer.stringLN`.

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.storeData("hello", true).storeData("hello", false);

console.log(writer.out()); /* Uint8Array(14) [ 0, 104, 101, 108, 108, 111, 0, 9, 5, 104, 101, 108, 108, 111 ]
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

When storeData encounters a BigInt, it checks whether or not the bigint is positive or negative.

If it's positive bigint, storeData appends `10` to the buffer and then calls `Writer.vu`.

If it's a negative bigint, storeData appends `1` to the buffer and then calls `Writer.vu`, but obviously taking the positive version of the number.

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

    * Well, since we already have to use a byte to store the data type, we might as well just use that same byte to denote whether or not the integer is positive or negative.

# storeData: boolean

When storeData encounters a boolean (`true` or `false`) value, it appends `5` if the value is true, and it appends `6` if the value is false.

# storeData: number

The type `number` in javascript includes many things, such as, ironically, `NaN`, integers and floats.

Therefore, we have to add a few more checks to narrow down our options.

When storeData encounters NaN, it appends `2`.

When storeData encounters an Integer, it converts it to a BigInt and calls `storeData` again.

When storeData encounters Infinity, it appends `11`.

When storeData encounters -Infinity, it appends `12`.

When storeData encounters a Float, it throws an error.

# storeData: undefined

When storeData encounters `undefined`, it appends `7`.

# storeData: null

In reality, null is an object, however, since the object is so crowded, it'd get confusing, so I just put this here.

When storeData encounters `null`, it appends `8`.

# Example code for null, undefined, boolean, NaN, +Infinity, -Infinity

Since these are just 1 byte values, I'll give an example code for all of them in one block of code.

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.storeData(null).storeData(undefined).storeData(true).storeData(false).storeData(Infinity).storeData(-Infinity);

console.log(writer.out()); /* Uint8Array(6) [ 8, 7, 5, 6, 11, 12 ]
8, 7, 5, 6, 11, and 12 indicate null, undefined, true, false, Infinity, and -Infinity respectively
*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // null
console.log(reader.getData()); // undefined
console.log(reader.getData()); // true
console.log(reader.getData()); // false
console.log(reader.getData()); // Infinity
console.log(reader.getData()); // -Infinity

```

# storeData: Arrays

In reality, arrays are objects, however, since the object is so crowded, it'd get confusing, so I just put this here.

When storeData encounters an array, it appends `3` and calls `Writer.vu` with the length of the array. Then, it calls `Writer.storeData` for each of the elements to store them.

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

When storeData encounters an object, it appends `4` and calls `Writer.vu` with the length of the object's keys.

Side note: Unfortunately, javascript transforms the numeric keys of an object to strings:

```js
let obj = {1: "hello"};

console.log(obj); // { '1': 'hello' }

console.log(Object.keys(obj)); // ['1']

```

Next, it loops through the keys of the object, and it checks whether the key is found in the lookup table or not.

The lookup table is basically a giant object with the keys as numbers and values as strings.

However, to encode, we use the reverse lookup, which is just the lookup with the keys and values swapped.

So, for example:

```js
let lookup = { // If this were the lookup, the reverse would be...
    '0': "hello",
    '1': "hi"
};

let reverse = { // this.
    "hello": 0,
    "hi": 1
};

// Note that when calling the constructor, this is not how the lookups are inputted. Instead, they are simply inputted as an array of strings, and the code transforms them into these objects.

```

If it does find the lookup, it appends a `0` to tell the reader that we found a key, and stores the number we found

Otherwise, it checks whether `storeStringAsNT` is true:

If it is, it appends a `1` to tell the reader that we didn't find a lookup, so we're storing the key as a null terminated string.

Otherwise, it appends a `2` to tell the reader that we didn't find a lookup, so we're storing the key as a length based string.

Then it calls `Writer.storeData` to store the value of the key.

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
    
    Finally, it's time to get the value of the object
    4 indicates an object
    1 indicates that there's 1 key/pair to this object.

        Next we need to get the key.
        1 indicates that the key is not found in the lookup table, and that it's stored as a null terminated string.
        104, and 105 are character codes for "h", and "i" respectively, encoded as a vu
        0 indicates the end of the string

        Finally, it's time to get the value of the object
        10 indicates a positive bigint
        1 is the value of the bigint, encoded as a vu
*/

const reader = new Reader(writer.out(), {
    lookup: ["hello"]
});

console.log(reader.getData()); // { hello: { hi: 1n } }
```

# To-do list

There are still lots of features to implement for this library, such as:

* Floats
* Better documentation
* More checks for error handling

And many more!

# Pull requests and issues

Pull requests and issues are welcome. Changing this to make your own version is welcome.