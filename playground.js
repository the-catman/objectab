// Welcome to the playground!

const { Reader, Writer } = require("./lib/main");

const writer = new Writer({
    lookupJSON: ["hello"]
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
    
    Finally, it's time to get the value of the object
    4 indicates an object
    1 indicates that there's 1 key/pair to this object.

        Next we need to get the key.
        1 indicates that the key is not found in the lookup table, and that it's stored as a null terminated string.
        104, and 105 are character codes for "h", and "i" respectively, encoded as a vu
        0 indicates the end of the string

        Finally, it's time to get the value of the object
        10 indicates a positive bigint
        1 is the value of the bigint, encoded as a vu
*/

const reader = new Reader(writer.out(), {
    lookupJSON: ["hello"]
});

console.log(reader.getData()); // { hello: { hi: 1n } }