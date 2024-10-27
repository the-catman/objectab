# OAB

ObjectAB or OAB stands for Object to ArrayBuffer.

## Version list

### Major updates

* `v1.0.0`: Library re-released

### Minor updates

* None.

## Installation

Copy [index.ts](./index.ts) into your project and use it.

## Q&A

### What is this library?

This is a library for converting some JavaScript objects into a Uint8Array and back. However, I didn't originally come up with the idea of doing this.

### Is it like JSON?

In a way, yes. However, JSON is more versatile, widely supported, and readable. However, the output is very large. JSON is also not natively a text to bytecode encoder, which means that you have to use something like `TextEncoder` to transform the JSON output to a Uint8Array.

### Is it efficient?

Run [test.ts](./test.ts) and see the results. It's around 3-4x slower than JSON but can achieve a smaller output size.

### Is it reliable?

I have tested this, and it most likely is reliable. If you do find an edge case that breaks this, please, by all means, open up a ticket. I'll try and solve the issue ASAP.

### How does the library work?

Take a look at [the code](./index.ts) yourself. I tried to make it as readable as possible.

### Is this code licensed?

Yes, under the MIT license.

### How do I make it compile to (insert specific project here)

Simple, use npx and tsc. For example:

```bash
$ npx tsc index.ts --target ES2022
```

## To-do list

* Empty.

## Pull requests and issues

Pull requests, issues, suggestions, and bug reports are welcome.

## Object storing

This library can store the following:

* null
* Booleans
* Strings
* Objects
* Arrays
* Integers
* Floats

* If a value is passed that does not match one of these data types, an error is thrown.

## Examples

Have a look at [examples.ts](./examples.ts), and you can easily pick up what this library is about.