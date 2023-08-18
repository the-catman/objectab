# OAB

ObjectAB or OAB stands for Object to ArrayBuffer.

# New stuff

MAJOR UPDATE!

Actually put error and out of bounds checking and handling.

THE PREVIOUS VERSION IS DEPRECATED, UNSAFE AND DANGEROUS! DO NOT USE!

# What is this library?

This is a library for converting some javascript objects into a Uint8Array.

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

The lookup has to be ***exactly*** the same on both the sender and receiver, or else every key that is present on the sender's lookup and is not present in the receiver's lookup gets set to `undefined`.

Another thing is that you can only retrieve objects in the same order as you stored them.

You *can* (but really shouldn't) store Integers with the `storeData` function.

This library mainly uses BigInts, meaning other functions do not support Integers.

If you attempt to forcefully store integers outsite of `storeData`, I don't know what will happen (nor do I care, since I haven't tested what would happen if ambitious programmers decided to break my library).

Floats are totally not supported, due to the nature of bigints and this library.

# Great! Where is the code?

The below is javascript code, however, porting to typescript way better. Definitely do use typescript to avoid unintentional errors.

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

// This is a null terminated string (NT string). This is an okay way of storing data, since trying to include a null character anywhere in the string breaks it.
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

If a value is passed that does not meet one of these requirements, an error is thrown.
(Floats aren't supported.)

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.storeData([1n, 2n, 3n, [{hello: 123n}, "hello hello 1234"]]);

const reader = new Reader(writer.out());

console.log(reader.getData()); // [1n, 2n, 3n, [{hello: 123n}, "hello hello 1234"]]

```

Also, `storeData` takes an optional boolean parameter called `storeStringAsNT`, defaulted to true.

As you can guess from the name, it determines whether or not all strings that are found in `storeData` should be stored as "Null Terminated" or "Length Based" strings.

# Optional parameters

Both `Reader` and `Writer` take an object (called options) as an optional parameter.

The `Reader` may have the following for optional parameters:
* lookupJSON: string[]
* OAB_THROW_ERROR_ON_GETDATA_UNKNOWN_INDEX: boolean = false
* OAB_THROW_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE: boolean = false
* OAB_THROW_ERROR_ON_ACCESSING_OUT_OF_BOUNDS: boolean = false
* OAB_THROW_ERROR_ON_BYTE_OUT_OF_BOUNDS: boolean = false

The `Writer` may have the following for optional parameters:
* lookupJSON: string[]
* OAB_WARN_LOOKUP_NOT_FOUND: boolean = false
* OAB_WARN_INT_NOT_SUPP: boolean = false

Both `Reader` and `Writer` share an optional parameter: the lookup table, which has to be the same between the receiver and sender.

It is for objects, so instead of writing the full key of the object as a string, we can just refer to the lookup table to make our task much more efficient.

If `options.OAB_WARN_LOOKUP_NOT_FOUND_SET` is set to true, then a warning will be shown when a Writer tries to write and the object's value is not found.

```js
const { Reader, Writer } = require("objectab");

const writer_1 = new Writer({
    lookupJSON: ["hello213213213213213213"]
});

writer_1.storeData({"hello213213213213213213": 123n});

console.log(writer_1.out().length); // 6

const writer_2 = new Writer();

writer_2.storeData({"hello213213213213213213": 123n});

console.log(writer_2.out().length); // 29

console.log(new Reader(writer_1.out(), {
    lookupJSON: ["hello213213213213213213"]
}).getData()); // {"hello213213213213213213": 123n}

console.log(new Reader(writer_2.out()).getData()); // {"hello213213213213213213": 123n}

```

# Warning logging

Turn the warnings for the lookup table failing to find a value (in `storeData`) and an integer being passed to `storeData` on or off using the following:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer({
    OAB_WARN_LOOKUP_NOT_FOUND: false,
    OAB_WARN_INT_NOT_SUPP: false
});

writer.storeData({hello: "hi"}); // No warning pops up in console
writer.storeData(1); // No warning pops up in console

writer.OAB_WARN_LOOKUP_NOT_FOUND = true;
writer.OAB_WARN_INT_NOT_SUPP = true;

writer.storeData({hello: "hi"}); // Warning pops up: Found a key that wasn't in the lookup table! hello.
writer.storeData(1); // Warning pops up: Warning: Regular integers are not supported. However, it was automatically converted to a bigint.

writer.OAB_WARN_LOOKUP_NOT_FOUND = false;
writer.OAB_WARN_INT_NOT_SUPP = false;

writer.storeData({hello: "hi"}); // No warning pops up in console
writer.storeData(1); // No warning pops up in console

```

# Error handling

Make sure to check out the optional parameters.

* The way `storeData` works is that it puts a byte before the actual data is stored, to indicate to the receiver what type of data it is. These values currently range from 0n to 10n.

    * If `getData` does not find a value that is from 0n to 10n, it checks whether OAB_THROW_ERROR_ON_GETDATA_UNKNOWN_INDEX is set to true, and if it is, it throws an error.

    * Otherwise, it returns `undefined`.

* Similarly, the `storeData`'s object also puts a byte before storing the key of the object to indicate to the receiver what to do with the key of the object. These values currently range from 0n to 2n.

    * If `getData` does not find a value that is from 0n to 2n, it checks whether OAB_THROW_ERROR_ON_GETDATA_OBJECT_WRONG_BYTE is set to true, and if it is, it throws an error.

    * Otherwise, the key is set to `undefined`.

* The way `stringLN` and `storeData`'s array and object storing works is that it stores the length of the data before the actual data. However, this means that a malicious sender could easily set the length to be extremely long and totally saturate your program.

    * If it is out of bounds and OAB_THROW_ERROR_ON_ACCESSING_OUT_OF_BOUNDS is set to true, an error is thrown.

    * Otherwise, it breaks out of the loop and returns the data.

        * Note that `storeData` is recursive and uses the same function to store array elements as it does regular data. This means that if this value is false, but OAB_THROW_ERROR_ON_GETDATA_UNKNOWN_INDEX is true, it will still throw an error because the next value is undefined.

* If `byte` tries accessing out of bounds, then it most likely means the sender is malicious.

    * If OAB_THROW_ERROR_ON_BYTE_OUT_OF_BOUNDS is set to true, an error is thrown.

    * Otherwise, it returns 0n.

# To-do list

There are still lots of features to implement for this library, such as:

* Floats
* Better documentation
* More checks for error handling

And many more!

# Pull requests and issues

Pull requests and issues are welcome. Changing this to make your own version is welcome.

You may use this library in a closed source program.