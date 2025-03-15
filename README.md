# OAB

ObjectAB or OAB stands for Object to ArrayBuffer.

## Version list

### Major updates

* `v1.0.0`: Library re-released.

### Minor updates

* `v1.0.1`: Added single character encoding using UTF-8, cleaned up code, added better comments.

## Installation

Copy [index.ts](./index.ts) into your project and use it.

## Q&A

### What is this library?

This is a library for converting some JavaScript objects into a Uint8Array and back. However, I didn't originally come up with the idea of doing this.

### Is it like JSON?

In a way, yes. However, JSON is more versatile, widely supported, and readable. However, the output is very large. JSON is also not natively a text to bytecode encoder, which means that you have to use something like `TextEncoder` to transform the JSON output to a Uint8Array. Hence, the library.

### Is it efficient?

Run [test.ts](./test.ts) and see the results. It's around 3x slower than JSON but can achieve a smaller output size.

### Is it reliable?

I have tested this, and it most likely is reliable. If you do find an edge case that breaks this, please, by all means, open up a ticket. I'll try and solve the issue ASAP.

## To-do list

* Add double precision support.
* Allow more flexibility while writing data (i.e. option to store as single precision or double precision, etc).

## Pull requests and issues

Pull requests, issues, suggestions, and bug reports are welcome.

## Object storing

This library can store the following:

* Nulls
* Booleans
* Strings
* Objects 
* Arrays
* Integers (32 bits)
* Floats (single precision)

If a value is passed that does not match one of these data types, an error is thrown.

## Notes

* Objects and primitive datatypes must be stored and retrieved in the same order, or your data will be corrupted, or the program will throw an error.

    * Similarly, the Lookup array must be the same on both the Writer and Reader.

* This will underperform if you do not use the lookup table. In fact, JSON can achieve a somewhat similar output size but do it 3x faster.

## Examples

Have a look at [examples.ts](./examples.ts), and you can easily pick up what this library is about.