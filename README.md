# Reading the docs

* Be sure to check out the [github README](https://github.com/the-catman/objectab), it has much more detailed documentation.

# Outdated versions

* The versions below `v1.2.0` are all deprecated and dangerous. I have unpublished them. DO NOT USE THEM!

# Installation

```bash
npm install typescript
```

# Example

* The code below is in javascript, however, porting to typescript is way better, faster, and easier.

Basic example:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

// As I previously said, this library mainly supports bigints.
// This is a byte, 0 -> 255. Pretty simple.
// Attempting to store above this value will just clamp it to 255.
writer.byte(123n);
// "wHY dOeS A bYTE HAvE TO bE A BIgiNt". Well, if you don't like it, fix it in your version.

// This is a variable length unsigned integer (uses the LEB128 algorithm). The larger the integer is, the larger the output.
// Can store from 0 -> as big as bigints and Uint8Arrays can get???
// Attempting to store a negative number will throw an error.
writer.vu(1093021321n);

// This is a variable length signed integer. 
// You can store negative numbers with this. It's just not very space efficient since it uses 1 extra bit to store the sign
writer.vi(-123032321n);

// This is a float. It's quite space demanding, and not all that accurate (unless you use float64 which is even more space demanding, but provides more accuracy)
// If you can, avoid this. Otherwise, you can use it no problem.
writer.float32(0.123892183);

// This is a null terminated string (NT string). This is an okay way of storing data, but trying to include a null character anywhere in the string breaks it.
writer.string("Hello!");

// This is a length-based string (LN string). Before the string data, it appends the string's length.
// The current version checks whether the reader is going out of bounds of the Uint8Array, and if it is, the loop is exited.
// Therefore, this is pretty safe.
// It doesn't that that much more space compared to a null terminated string for shorter strings.
writer.stringLN("Hello from LENGTH!");

// Writer.out() outputs the buffer as a Uint8Array
const reader = new Reader(writer.out());

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

Example code:

```js
const { Reader, Writer } = require("objectab");

const writer = new Writer();

writer.storeData([1n, 2n, 3n, [{hello: 123n}, "hello hello 1234"]]);

const reader = new Reader(writer.out());

console.log(reader.getData()); // [1n, 2n, 3n, [{hello: 123n}, "hello hello 1234"]]

```