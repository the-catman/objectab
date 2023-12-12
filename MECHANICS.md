# Packet structure

* This library library is based around the `Uint8Array` class. In JavaScript, this is a non-dynamic (i.e. length is specified when calling the constructor), unsigned 8 bit integer array.

    * This means that it can't grow as you wish, and the length is constant. It also means the numbers we can use are from 0 -> 255. In hexadecimal, 0x00 -> 0xff. In binary, 0b00000000 -> 0b11111111.

    * Unsigned simply means that the numbers do not have a sign, i.e. they're always positive.

    * 8 bit means that the largest value that each index can hold is 8 bits.

* This seriously limits our options for size. We cannot simply just do something like:

```js
let buf = new Uint8Array([256620341]);

console.log(buf[0]); // 53

// 53 === 256620341 & 255
```

Fortunately, we can use clever tricks to work around this restriction...

## Data type: byte

* Starting off, the most obvious data type is a single byte, or 8 bits.

* Since Uint8Arrays can support up to 8 bits for each index, that means we can store up to 8 bits (11111111 in binary, 255 in decimal) without any problems.

### Example code

```js
const { Reader, Writer } = require("./index.js");

const writer = new Writer();

writer.byte(255n);

console.log(writer.out()); /* Uint8Array(1) [ 255 ]
There's our number!
*/

const reader = new Reader(writer.out());

console.log(reader.byte()); // 255n
```

## Data type: vu (or variable length unsigned integer)

* You can read in depth about `vu` (in reality, LEB128) [here](https://en.wikipedia.org/wiki/LEB128).

* This is quite an interesting datatype. The way it works is that it stores 7 bits of the number at a time, and the [most significant bit](https://en.wikipedia.org/wiki/Bit_numbering) indicates whether or not there's more data coming.

### Storing

* For example, to store the number 1921, which is 11110000001 in binary, we do the following:

    * First, we take the least 7 significant bits (0000001). Then we check whether or not there's more data we need to store.

        * Indeed, there is still 4 bits we need to store, so we add an 8th bit with the value as `1` (10000001), indicating that there's still more data to be read.

    * Then we store this number (10000001 in binary or 129 in decimal). This is perfectly fine, since for each index of the Uint8Array, we can store up to 8 bits (or 255 in decimal).

    * Now, back to the original number (11110000001). Since we took the least 7 significant bits, we can scrap those and we get 1111.

    * Then we check whether or not there's more data we need to store.

        * Indeed, there is no more data to store after this. So we simply store this number (1111 in binary, 15 in decimal) as it is, without appending anything.

* Now, we have a Uint8Array with index 0 as 129 and index 1 as 15.

### Retrieving

* To retrieve the original integer, it's very simple:

    * We take the first value (10000001 in binary, 129 in decimal), and look at the 8th bit.

        * It is `1`, that means that we still have more data to read.

    * Then, we take the least 7 significant bits (0000001) and append it to a counter.

    * Next, we look at the second value (00001111 in binary, 15 in decimal), since we had more data to read.

        * We look at the 8th bit, and it is 0, that means we have reached the end of our `vu`.

            * Then, we take the least 7 significant bits (0001111) and **append** (not add) it to the counter.

    * Now, our counter is 00011110000001. We scrap the zeros at the end (think of it as 00,001,234 is the same as 1,234, we don't write the zeros at the front), so now our number is 11110000001, which matches with our original number.

### Example code

```js

const { Reader, Writer } = require("./index.js");

const writer = new Writer();

writer.vu(1921n);

console.log(writer.out()); // Uint8Array(2) [ 129, 15 ]

const reader = new Reader(writer.out());

console.log(reader.vu()); // 1921n
```

## Data type: vi (or variable length signed integer)

### Storing

* Let's say we have the number -1921. We note the sign (it's minus), and we take the absolute value of the number (basically scrap the negative sign, and we get 1921).

    * Next, let's take a look at 1921 in binary. It's 11110000001. We add an additional bit at the beginning of this, which corresponds to the sign. If it's `1`, that means our number is negative. If it's `0`, it means our number is positive.

        * Since our original number was negative, we push `1` to this, so now our number becomes 111100000011. You can see that this uses up an extra bit to store the sign.

    * Next, we simply encode this number as a vu.

### Retrieving

* To retrieve the original integer, it's, again, very simple.

    * We decode the vu and get 111100000011. Next, we look at the least significant bit (i.e. the rightmost bit).

        * It is `1`, which means our number is negative.

    * Then we simply scrap the least significant bit, and get 11110000001.

    * Since our least significant bit was `1`, our number is negative, so that means our number is -11110000001 in binary or -1921 in decimal.

### Example code

```js

const { Reader, Writer } = require("./index.js");

const writer = new Writer();

writer.vi(-1921n);

console.log(writer.out()); // [131, 30]

const reader = new Reader(writer.out());

console.log(reader.vi()); // -1921n
```

## String encoding: 2 types

* We have 2 ways to do this; both are very easy.

### Data type: Null terminated strings

#### Storing

* We take each character of a string and encodes gets its character code (which is a number). Then we encode the character code as a vu.

    * We continue encoding until the writer reaches the end of the string.

        * When it does, it puts a `0`.

#### Retrieving

* To retrieve the original string, we start decoding each character's vu, then get the character associated with the character code. We append this to a variable.
    * We continue decoding and appending until the reader hits a `0`. Then, it stops.

#### Example code

```js

const { Reader, Writer } = require("./index.js");

const writer = new Writer();

writer.string("hi");

console.log(writer.out()); // [104, 105, 0]

const reader = new Reader(writer.out());

console.log(reader.string()); // "hi"
```

### Data type: Length based strings

* This is a similar version of the previous encoding method.

#### Storing

* Instead of appending a null character to indicate that the string has ended, we simply store the length of the string as a vu before encoding the actual string itself.

#### Retrieving

* To retrieve the original string, we read a vu (to read the length of the string), and we start decoding each character's vu, until we know the string finishes.

#### Example code

```js
const { Reader, Writer } = require("./index.js");

const writer = new Writer();

writer.stringLN("hi");

console.log(writer.out()); // [2, 104, 105]

const reader = new Reader(writer.out());

console.log(reader.stringLN()); // "hi"
```

# storeData and getData

* Now that we have the tools to store basic data types, we can move onto more complex data types such as objects and arrays.

## Storing

* When a value is passed to storeData to encode, the first thing we have to do is check what type of data it is. Is it an integer, a string, an object?

    * Then, according to the data type, we append a special byte, and encode it using one of the methods mentioned below.

        * This special byte tells the reader what data type to read (so it knows how to process and decode the data).

        * Think of it as manufacturing a box cake. When you sell a box cake to a customer, they have no idea what to do with it; how many eggs should they add, how long should they cook it for, and should they cook it at a low or a high temperature? If you don't provide instructions on how to prepare and bake the cake, it will most likely turn out to be a sloppy mess.

        * This is even more so the case in programming, where a single bit can change a whole packet structure, totally destroying your packet, especially since computers do not have intuition and cannot correct mistakes on the fly; they just do what you tell them to do.

## storeData: String

* When a storeData encounters a string, it checks whether or not [`OAB_WRITER_STORE_STRING_AS_NT`](./README.md#writer-constructor) is true.

    * If it is, storeData appends `0` to the buffer and then calls `Writer.string`.

    * Otherwise, storeData appends `9` to the buffer and then calls `Writer.stringLN`.

### Example code

```js
const { Reader, Writer } = require("./index.js");

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

## storeData: BigInt

* When storeData encounters a bigint, it checks whether or not the bigint is positive or negative.
    * If it's positive bigint, storeData appends `10` to the buffer and then calls `Writer.vu` on the number.

    * If it's a negative bigint, storeData appends `1` to the buffer and then calls `Writer.vu` on the positive version of the number.

* Why don't we use vi?

    * Well, since we already have to use a byte to store the data type, we might as well just use that same byte to denote whether or not the integer is positive or negative. No need to use pointless indicators!

### Example code

```js
const { Reader, Writer } = require("./index.js");

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

## storeData: boolean

* When storeData encounters a boolean (`true` or `false`) value, it appends `5` if the value is true, and it appends `6` if the value is false.

### Example code

```js
const { Reader, Writer } = require("./index.js");

const writer = new Writer();

writer.storeData(true).storeData(false);

console.log(writer.out()); /* Uint8Array(1) [ 5, 6 ]
5 and 6 indicate true and false respectively
*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // true
console.log(reader.getData()); // false
```

## storeData: Integer/Float

* When storeData encounters an Integer or a Float, it checks whether [`OAB_WRITER_STORE_FLOAT_AS_32`](./README.md#writer-constructor) is set to true.

    * If it is, it appends `13`. Then, it uses an ArrayBuffer to converse between a Float32Array and a BigUint64Array, essentially allowing us to convert the Float to a BigInt. Then, it stores the bigint as a vu.

    * Otherwise, it appends `14`. Then, it uses an ArrayBuffer to converse between a Float64Array and a BigUint64Array, and convert it to a BigInt. Then, it stores the bigint as a vu.
    
    * Both these methods are quite intensive on space, so use them with care.

        * Storing it as 64 bits is way more intensive on space, so do be careful!

### Example code

```js
const { Reader, Writer } = require("./index.js");

const writer = new Writer({
    OAB_WRITER_STORE_FLOAT_AS_32: true
});

writer.storeData(0.123892183);

console.log(writer.out()); // Uint8Array(6) [ 13, 175, 246, 246, 239, 3 ]
// 5 bytes used for storing float. It's not too awful. However...

const reader = new Reader(writer.out());

console.log(reader.getData()); // 0.12389218062162399
// You can see that it is somewhat inaccurate

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

## storeData: NaN (or Not a Number)

* When storeData encounters NaN, it appends `2`.

### Example code

```js
const { Reader, Writer } = require("./index.js");

const writer = new Writer();

writer.storeData(NaN);

console.log(writer.out()); /* Uint8Array(1) [ 2 ]
2 indicates NaN
*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // NaN
```

## storeData: +Infinity

* When storeData encounters Infinity, it appends `11`.

### Example code

```js
const { Reader, Writer } = require("./index.js");

const writer = new Writer();

writer.storeData(Infinity);

console.log(writer.out()); /* Uint8Array(1) [ 11 ]
11 indicates Infinity
*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // Infinity
```

## storeData: -Infinity

* When storeData encounters -Infinity, it appends `12`.

### Example code

```js
const { Reader, Writer } = require("./index.js");

const writer = new Writer();

writer.storeData(-Infinity);

console.log(writer.out()); /* Uint8Array(1) [ 12 ]
12 indicates -Infinity
*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // -Infinity
```

## storeData: undefined

* When storeData encounters `undefined`, it appends `7`.

### Example code

```js
const { Reader, Writer } = require("./index.js");

const writer = new Writer();

writer.storeData(undefined);

console.log(writer.out()); /* Uint8Array(1) [ 7 ]
7 indicates undefined
*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // undefined
```

## storeData: null

* When storeData encounters `null`, it appends `8`.

### Example code

```js
const { Reader, Writer } = require("./index.js");

const writer = new Writer();

writer.storeData(null);

console.log(writer.out()); /* Uint8Array(1) [ 8 ]
8 indicates null
*/

const reader = new Reader(writer.out());

console.log(reader.getData()); // null
```

## storeData: Arrays

* When storeData encounters an array, it appends `3` and calls `Writer.vu` with the length of the array. Then, it calls `Writer.storeData` on each of the elements to store them.

    * This means that it is possible to store multi-dimensional arrays.

### Example code

```js
const { Reader, Writer } = require("./index.js");

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

## storeData: Objects

* When storeData encounters an object, it appends `4` and calls `Writer.vu` with the length of the object's keys.

    * Next, it loops through the keys of the object, and it checks whether the key is found in the lookup table or not.

        * The lookup table is basically a giant array of strings.
    
        * If it does find the lookup, it appends a `0` to tell the reader that we found a key, and stores the number we found.

            * Otherwise, it checks whether [`OAB_WRITER_STORE_STRING_AS_NT`](./README.md#writer-constructor) is true:
        
                * If it is, it appends a `1` to tell the reader that we didn't find a lookup, so we're storing the key as a null terminated string.
    
                * Otherwise, it appends a `2` to tell the reader that we didn't find a lookup, so we're storing the key as a length based string.

    * Then it calls `Writer.storeData` to store the value of the key.

        * This means that it is possible to store multi-dimensional objects.

### Example code

```js
const { Reader, Writer } = require("./index.js");

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
