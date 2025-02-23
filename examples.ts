import { Reader, Writer } from "./index.ts";

// Example: basic storing and retrieving of primitive data types

let writer = new Writer();

writer.string("Hello!").vu(123).vi(-123).vi(456).float(5.4).float(-4.5).byte(234);

let reader = new Reader(writer.out());

console.log(reader.string(), reader.vu(), reader.vi(), reader.vi(),
    reader.float(), reader.float(), reader.byte()); // Hello! 123 -123 456 5.400000095367432 -4.5 234

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
