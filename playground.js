// Welcome to the playground!

const { Reader, Writer } = require("./lib/main");

const writer = new Writer();

const reader = new Reader(writer.out(), {
    OAB_THROW_ERROR_ON_BYTE_OUT_OF_BOUNDS: false
});

console.log(reader.vu());