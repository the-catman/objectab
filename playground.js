// Welcome to the playground!
// Basically just a place to test code :)

const { Reader, Writer } = require("./index");

const writer = new Writer();

writer.byte(255n);

console.log(writer.out()); /* Uint8Array(1) [ 255 ]
There's our number!
*/

const reader = new Reader(writer.out());

reader.byte(); // 255n