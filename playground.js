// Welcome to the playground!

const { Reader, Writer } = require("./lib/main");

const writer = new Writer({
    lookup: ["hello"]
});

writer.storeData({hello: {
    hi: 1n
}})

console.log(writer.out());

const reader = new Reader(writer.out(), {
    //OAB_READER_ERROR_ON_OOB_LOOKUP: true
});

console.log(reader.getData()); // { hello: { hi: 1n } }