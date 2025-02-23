import { OABDATA, Reader, Writer } from "./index.ts";

function getKeys(obj: Record<string, any>): string[] {
    const keys: Set<string> = new Set();

    function collectKeys(currentObj: any) {
        for (const key in currentObj) {
            keys.add(key);
            const value = currentObj[key];

            if (typeof value === 'object') {
                if (Array.isArray(value)) {
                    value.forEach(item => {
                        if (item && typeof item === 'object') {
                            collectKeys(item);
                        }
                    });
                } else {
                    collectKeys(value);
                }
            }
        }
    }
    collectKeys(obj);
    return Array.from(keys);
}

const sampleData = {
    "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john.doe@example.com",
        "isActive": true,
        "relationshipStatus": "married",
        "isMale": true,
        "spouseName": "Sarah",
        "age": 30,
        "socialCreditScore": null,
        "roles": ["admin", "user"],
        "profile": {
            "bio": "Software developer with a passion for open-source.",
            "website": "https://johndoe.dev",
            "socialMedia": {
                "twitter": "@johndoe",
                "linkedin": "linkedin.com/in/johndoe"
            }
        }
    },
    "posts": [
        {
            "id": 101,
            "title": "Introduction to JSON",
            "content": "JSON is a lightweight data interchange format.",
            "tags": ["json", "data", "format"],
            "createdAt": "2023-10-01T10:00:00Z"
        },
        {
            "id": 102,
            "title": "Understanding Endianness",
            "content": "Endianness refers to the order of bytes in binary representation.",
            "tags": ["endianness", "programming", "binary"],
            "createdAt": "2023-10-15T14:30:00Z"
        }
    ],
    "comments": [
        {
            "postId": 101,
            "userId": 2,
            "comment": "Great article!",
            "createdAt": "2023-10-02T09:00:00Z"
        },
        {
            "postId": 102,
            "userId": 3,
            "comment": "Very informative. Thanks!",
            "createdAt": "2023-10-16T11:45:00Z"
        }
    ],
    "meta": {
        "totalPosts": 2,
        "totalComments": 2,
        "lastUpdated": "2023-10-20T15:00:00Z"
    }
};

function check(lookup: string[]) {
    const writerData = new Writer({ lookup }).data(sampleData).out();
    const JSONdata = JSON.stringify(sampleData);

    const sanityCheck = new Reader(writerData, { lookup }).data();

    if (JSONdata === JSON.stringify(sanityCheck)) {
        console.log("Sanity checks passed!");
    } else {
        console.log("Something went wrong!", sanityCheck);
    }

    console.log(`Writer data length: ${writerData.length}, JSON length: ${JSONdata.length}.`);
    console.log(`Total data saved: ${JSONdata.length - writerData.length} bytes.`);

    const iters = 500000;

    let date = Date.now();

    for (let i = 0; i < iters; i++) {
        let someData = new Reader(
            new Writer({ lookup }).data(sampleData).out(),
            { lookup }
        ).data();
        (someData as { [key: string]: OABDATA }).test = 1;
    }

    console.log(`OAB Speed: ${writerData.length / ((Date.now() - date) / 1000) * iters / 1000000} MB/s`);

    date = Date.now();

    for (let i = 0; i < iters; i++) {
        let someData = JSON.parse(JSON.stringify(sampleData));
        someData.test = 1;
    }

    console.log(`JSON Speed: ${JSONdata.length / ((Date.now() - date) / 1000) * iters / 1000000} MB/s`);
}

console.log("Full lookup test:");
check(getKeys(sampleData));

console.log("\n\nNo lookup test:");
check([]);
