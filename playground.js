// Welcome to the playground!

const { Reader, Writer } = require("./lib/main");

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