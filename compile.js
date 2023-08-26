const { renameSync } = require("node:fs");
const { execSync } = require("node:child_process");

console.log("Attempting to compile to ES module");
try
{
    execSync("npx tsc index.ts --target ES2022");
}
catch(err)
{
    throw new Error(err.stdout.toString());
}
renameSync("index.js", "index.mjs");

try
{
    execSync("npx tsc index.ts --target ES2022 --module CommonJS");
}
catch(err)
{
    throw new Error(err.stdout.toString());
}
console.log("Compiled.");