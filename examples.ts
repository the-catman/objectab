import { Reader, Writer } from "./index.ts";

// Example: basic storing and retrieving of primitive data types

let writer = new Writer();

writer.string("Hello!").vu(123).vi(-123).vi(456).float(5.4).float(-4.5).byte(234);

let reader = new Reader(writer.out());

console.log(reader.string(), reader.vu(), reader.vi(), reader.vi(),
    reader.float(), reader.float(), reader.byte()); // Hello! 123 -123 456 5.400000095367432 -4.5 234

// Example with wrong order of retrieving: when data is malformed.

reader = new Reader(writer.out());

console.log(reader.vu(), reader.vi(), reader.float(), reader.byte()); // 6 36 1.4153114489680652e-43 108

// Note: might just throw an error instead.

// Example: basic storing and retrieving of objects

writer = new Writer();

writer.data([1, 2, 3, [{ hello: 123 }, "hello hello 1234"]]);

reader = new Reader(writer.out());

console.log(reader.data()); // [ 1, 2, 3, [ { hello: 123 }, "hello hello 1234" ] ]

// Complex example: advanced storing and retrieving

let lookup = ["test"];

writer = new Writer({ warnIfNoLookup: true, lookup });

writer.data([1, 2, 3, [{ "hello": 123 }, { "test": 1 }, "hello hello 1234"]]); // A key wasn't in the lookup table! hello.

reader = new Reader(writer.out(), { lookup });

console.log(reader.data()); // [ 1, 2, 3, [ { hello: 123 }, { test: 1 }, "hello hello 1234" ] ]

// Example with malformed keys: when the lookups don't match but are the same length

reader = new Reader(writer.out(), { lookup: ["abcd"] });

console.log(reader.data()); // [ 1, 2, 3, [ { hello: 123 }, { abcd: 1 }, "hello hello 1234" ] ]

// Example with errors: when lookups aren't the same length

reader = new Reader(writer.out(), { lookup: [] });

console.log(reader.data()); // Error: `getData`'s object key strong looked up a value out of bounds!
