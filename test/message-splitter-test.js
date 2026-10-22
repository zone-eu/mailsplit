'use strict';

const { test } = require('node:test');

const fs = require('fs');
const crypto = require('crypto');
const MessageSplitter = require('../lib/message-splitter');
const MessageJoiner = require('../lib/message-joiner');
const { Readable, Transform } = require('stream');
const ChunkedPassthrough = require('../lib/chunked-passthrough');

test('Split simple message', (t, done) => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(data.getHeaders().toString(), 'Subject: test\nMime-Version: 1.0\n\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'body');
            t.assert.strictEqual(data.value.toString(), 'Hello world!');
        }
    ];
    t.plan(6);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        t.assert.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        done();
    });

    splitter.end('Subject: test\nMime-Version: 1.0\n\nHello world!');
});

test('Split simple message with line ending', (t, done) => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(data.getHeaders().toString(), 'Subject: test\nMime-Version: 1.0\n\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'body');
            t.assert.strictEqual(data.value.toString(), 'Hello world!\r\n');
        }
    ];
    t.plan(6);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        t.assert.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        done();
    });

    splitter.end('Subject: test\nMime-Version: 1.0\n\nHello world!\r\n');
});

test('Split message with header only 1', (t, done) => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(data.getHeaders().toString(), 'Subject: test\nMime-Version: 1.0');
        }
    ];
    t.plan(3);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        t.assert.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        done();
    });

    splitter.end('Subject: test\nMime-Version: 1.0');
});

test('Split message with header only 2', (t, done) => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(data.getHeaders().toString(), 'Subject: test\nMime-Version: 1.0\n');
        }
    ];
    t.plan(3);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        t.assert.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        done();
    });

    splitter.end('Subject: test\nMime-Version: 1.0\n');
});

test('Split message with empty body', (t, done) => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(data.getHeaders().toString(), 'Subject: test\nMime-Version: 1.0\n\n');
        }
    ];
    t.plan(3);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        t.assert.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        done();
    });

    splitter.end('Subject: test\nMime-Version: 1.0\n\n');
});

test('Split message with no header', (t, done) => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(data.getHeaders().toString(), '\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'body');
            t.assert.strictEqual(data.value.toString(), 'Hello world!');
        }
    ];
    t.plan(6);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        t.assert.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        done();
    });

    splitter.end('\nHello world!');
});

test('Split multipart message', (t, done) => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(
                data.getHeaders().toString(),
                'Content-type: multipart/mixed; boundary=ABC\r\nX-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\nSubject: ABCDEF\r\n\r\n'
            );
        },
        data => {
            t.assert.strictEqual(data.type, 'data');
            t.assert.strictEqual(data.value.toString(), '--ABC\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(
                data.getHeaders().toString(),
                'Content-Type: application/octet-stream\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\x27test.pdf\x27\r\n\r\n'
            );
        },
        data => {
            t.assert.strictEqual(data.type, 'body');
            t.assert.strictEqual(data.value.toString(), 'AAECAwQFBg==');
        },
        data => {
            t.assert.strictEqual(data.type, 'data');
            t.assert.strictEqual(data.value.toString(), '\r\n--ABC--');
        }
    ];
    t.plan(15);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        t.assert.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        done();
    });

    splitter.end(
        Buffer.from(
            'Content-type: multipart/mixed; boundary=ABC\r\n' +
                'X-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\n' +
                'Subject: ABCDEF\r\n' +
                '\r\n' +
                '--ABC\n' +
                'Content-Type: application/octet-stream\r\n' +
                'Content-Transfer-Encoding: base64\r\n' +
                'Content-Disposition: attachment; filename=\x27test.pdf\x27\r\n' +
                '\r\n' +
                'AAECAwQFBg==\r\n' +
                '--ABC--'
        )
    );
});

test('Split multipart message without terminating boundary', (t, done) => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(
                data.getHeaders().toString(),
                'Content-type: multipart/mixed; boundary=ABC\r\nX-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\nSubject: ABCDEF\r\n\r\n'
            );
        },
        data => {
            t.assert.strictEqual(data.type, 'data');
            t.assert.strictEqual(data.value.toString(), '--ABC\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(
                data.getHeaders().toString(),
                'Content-Type: application/octet-stream\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\x27test.pdf\x27\r\n\r\n'
            );
        },
        data => {
            t.assert.strictEqual(data.type, 'body');
            t.assert.strictEqual(data.value.toString(), 'AAECAwQFBg==');
        }
    ];
    t.plan(12);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        t.assert.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        done();
    });

    splitter.end(
        Buffer.from(
            'Content-type: multipart/mixed; boundary=ABC\r\n' +
                'X-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\n' +
                'Subject: ABCDEF\r\n' +
                '\r\n' +
                '--ABC\n' +
                'Content-Type: application/octet-stream\r\n' +
                'Content-Transfer-Encoding: base64\r\n' +
                'Content-Disposition: attachment; filename=\x27test.pdf\x27\r\n' +
                '\r\n' +
                'AAECAwQFBg=='
        )
    );
});

test('Split and join mimetorture message', (t, done) => {
    let data = fs.readFileSync(__dirname + '/fixtures/mimetorture.eml');

    let splitter = new MessageSplitter();
    let joiner = new MessageJoiner();

    let chunks = [];

    joiner.on('data', chunk => {
        chunks.push(chunk);
    });

    joiner.on('end', () => {
        t.assert.strictEqual(data.toString('binary'), Buffer.concat(chunks).toString('binary'));
        done();
    });

    fs.createReadStream(__dirname + '/fixtures/mimetorture.eml')
        .pipe(splitter)
        .pipe(joiner);
});

test('Fetch attachment from form-data', (t, done) => {
    let splitter = new MessageSplitter();

    let attachment = false;
    let hash = crypto.createHash('md5');
    let msghash = crypto.createHash('md5');

    splitter.on('data', data => {
        msghash.update(data.value || data.getHeaders());
        if (data.type === 'body' && attachment) {
            hash.update(data.value);
        } else {
            attachment = false;
            if (data.type === 'node' && data.filename) {
                attachment = true;
            }
        }
    });

    splitter.on('end', () => {
        // check file hash
        t.assert.strictEqual(msghash.digest('hex'), 'b6f36ec4e3985a93aee9047ea5c5e835');

        // check attachment hash
        t.assert.strictEqual(hash.digest('hex'), '6c7388d43ad5961b5c042bfbeb25de99');
        done();
    });

    fs.createReadStream(__dirname + '/fixtures/form-data.eml').pipe(splitter);
});

test('Split multipart message with embedded message/rfc88', (t, done) => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(
                data.getHeaders().toString(),
                'Content-type: multipart/mixed; boundary=ABC\r\nX-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\nSubject: ABCDEF\r\n\r\n'
            );
        },
        data => {
            t.assert.strictEqual(data.type, 'data');
            t.assert.strictEqual(data.value.toString(), '--ABC\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(data.getHeaders().toString(), 'Content-Type: message/rfc822\r\n\r\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'body');
            t.assert.strictEqual(data.value.toString(), 'Content-Type: text/plain\r\nContent-Transfer-Encoding: base64\r\n\r\nAAECAwQFBg==');
        },
        data => {
            t.assert.strictEqual(data.type, 'data');
            t.assert.strictEqual(data.value.toString(), '\r\n--ABC--');
        }
    ];
    t.plan(15);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        t.assert.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        done();
    });

    splitter.end(
        Buffer.from(
            'Content-type: multipart/mixed; boundary=ABC\r\n' +
                'X-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\n' +
                'Subject: ABCDEF\r\n' +
                '\r\n' +
                '--ABC\n' +
                'Content-Type: message/rfc822\r\n' +
                '\r\n' +
                'Content-Type: text/plain\r\n' +
                'Content-Transfer-Encoding: base64\r\n' +
                '\r\n' +
                'AAECAwQFBg==\r\n' +
                '--ABC--'
        )
    );
});

test('Split multipart message with embedded inline message/rfc88', (t, done) => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(
                data.getHeaders().toString(),
                'Content-type: multipart/mixed; boundary=ABC\r\nX-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\nSubject: ABCDEF\r\n\r\n'
            );
        },
        data => {
            t.assert.strictEqual(data.type, 'data');
            t.assert.strictEqual(data.value.toString(), '--ABC\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(data.getHeaders().toString(), 'Content-Type: message/rfc822\r\nContent-Disposition: inline\r\n\r\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(data.getHeaders().toString(), 'Content-Type: text/plain\r\nContent-Transfer-Encoding: base64\r\n\r\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'body');
            t.assert.strictEqual(data.value.toString(), 'AAECAwQFBg==');
        },
        data => {
            t.assert.strictEqual(data.type, 'data');
            t.assert.strictEqual(data.value.toString(), '\r\n--ABC--');
        }
    ];
    t.plan(18);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        t.assert.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        done();
    });

    splitter.end(
        Buffer.from(
            'Content-type: multipart/mixed; boundary=ABC\r\n' +
                'X-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\n' +
                'Subject: ABCDEF\r\n' +
                '\r\n' +
                '--ABC\n' +
                'Content-Type: message/rfc822\r\n' +
                'Content-Disposition: inline\r\n' +
                '\r\n' +
                'Content-Type: text/plain\r\n' +
                'Content-Transfer-Encoding: base64\r\n' +
                '\r\n' +
                'AAECAwQFBg==\r\n' +
                '--ABC--'
        )
    );
});

test('handles line break lines split into 2-byte chunks', (t, done) => {
    const message = fs.readFileSync(__dirname + '/fixtures/original.txt');

    const MAX_HEAD_SIZE = 2 * 1024 * 1024;
    const splitter = new MessageSplitter({
        ignoreEmbedded: true,
        maxHeadSize: MAX_HEAD_SIZE
    });

    splitter.on('data', data => {
        switch (data.type) {
            case 'node':
                // node header block
                break;
            case 'data':
                // multipart message structure
                // this is not related to any specific 'node' block as it includes
                // everything between the end of some node body and between the next header
                console.log(JSON.stringify(data.value.toString()));
                break;
            case 'body':
                // Leaf element body. Includes the body for the last 'node' block. You might
                // have several 'body' calls for a single 'node' block
                console.log(JSON.stringify(data.value.toString()));
                // console.log(data.value.toString());
                break;
        }
    });

    // Create a Transform stream that processes at most 2 bytes at a time
    class TwoByteChunker extends Transform {
        constructor(options) {
            super(options);
        }

        _transform(chunk, encoding, callback) {
            // Process the chunk in 2-byte segments
            for (let i = 0; i < chunk.length; i += 2) {
                const twoByteChunk = chunk.slice(i, i + 2);
                // Push each 2-byte chunk to the output
                this.push(twoByteChunk);
                // console.log(`Processing chunk: ${JSON.stringify(twoByteChunk.toString())}`);
            }
            callback();
        }
    }

    // Create a source stream with some test data
    const source = Readable.from(message);

    console.log(JSON.stringify(message.toString())); // Log raw message string for reference

    // Pipe through our chunker
    const chunker = new TwoByteChunker();

    source.pipe(chunker).pipe(new ChunkedPassthrough()).pipe(splitter);

    t.plan(0);
    done();
});

test('Split multipart message with embedded message/rfc822 with header only', (t, done) => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(data.getHeaders().toString(), 'Content-Type: multipart/mixed; boundary="ABC"\r\n\r\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'data');
            t.assert.strictEqual(data.value.toString(), '--ABC\r\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(data.getHeaders().toString(), 'Content-Type: message/rfc822\r\n\r\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'body');
            t.assert.strictEqual(data.value.toString(), 'Content-Type: text/plain; charset=utf-8\r\nSubject: OK');
        },
        data => {
            t.assert.strictEqual(data.type, 'data');
            t.assert.strictEqual(data.value.toString(), '\r\n--ABC--');
        }
    ];
    t.plan(15);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        t.assert.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        done();
    });

    splitter.end(
        Buffer.from(
            'Content-Type: multipart/mixed; boundary="ABC"\r\n' +
                '\r\n' +
                '--ABC\r\n' +
                'Content-Type: message/rfc822\r\n' +
                '\r\n' +
                'Content-Type: text/plain; charset=utf-8\r\n' +
                'Subject: OK\r\n' +
                '--ABC--'
        )
    );
});

test('Split multipart message and ignore embedded message/rfc88', (t, done) => {
    let splitter = new MessageSplitter({
        ignoreEmbedded: true
    });

    let tests = [
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(
                data.getHeaders().toString(),
                'Content-type: multipart/mixed; boundary=ABC\r\nX-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\nSubject: ABCDEF\r\n\r\n'
            );
        },
        data => {
            t.assert.strictEqual(data.type, 'data');
            t.assert.strictEqual(data.value.toString(), '--ABC\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(data.getHeaders().toString(), 'Content-Type: message/rfc822\r\n\r\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'body');
            t.assert.strictEqual(data.value.toString(), 'Content-Type: text/plain\r\nContent-Transfer-Encoding: base64\r\n\r\nAAECAwQFBg==');
        },
        data => {
            t.assert.strictEqual(data.type, 'data');
            t.assert.strictEqual(data.value.toString(), '\r\n--ABC--');
        }
    ];
    t.plan(15);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        t.assert.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        done();
    });

    splitter.end(
        Buffer.from(
            'Content-type: multipart/mixed; boundary=ABC\r\n' +
                'X-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\n' +
                'Subject: ABCDEF\r\n' +
                '\r\n' +
                '--ABC\n' +
                'Content-Type: message/rfc822\r\n' +
                '\r\n' +
                'Content-Type: text/plain\r\n' +
                'Content-Transfer-Encoding: base64\r\n' +
                '\r\n' +
                'AAECAwQFBg==\r\n' +
                '--ABC--'
        )
    );
});

test('Split multipart message and embedded message/rfc88', (t, done) => {
    let splitter = new MessageSplitter({
        ignoreEmbedded: false,
        defaultInlineEmbedded: true
    });

    let tests = [
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(
                data.getHeaders().toString(),
                'Content-type: multipart/mixed; boundary=ABC\r\nX-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\nSubject: ABCDEF\r\n\r\n'
            );
        },
        data => {
            t.assert.strictEqual(data.type, 'data');
            t.assert.strictEqual(data.value.toString(), '--ABC\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(data.getHeaders().toString(), 'Content-Type: message/rfc822\r\n\r\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'node');
            t.assert.strictEqual(data.getHeaders().toString(), 'Content-Type: text/plain\r\nContent-Transfer-Encoding: base64\r\n\r\n');
        },
        data => {
            t.assert.strictEqual(data.type, 'body');
            t.assert.strictEqual(data.value.toString(), 'AAECAwQFBg==');
        },
        data => {
            t.assert.strictEqual(data.type, 'data');
            t.assert.strictEqual(data.value.toString(), '\r\n--ABC--');
        }
    ];
    t.plan(18);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        t.assert.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        done();
    });

    splitter.end(
        Buffer.from(
            'Content-type: multipart/mixed; boundary=ABC\r\n' +
                'X-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\n' +
                'Subject: ABCDEF\r\n' +
                '\r\n' +
                '--ABC\n' +
                'Content-Type: message/rfc822\r\n' +
                '\r\n' +
                'Content-Type: text/plain\r\n' +
                'Content-Transfer-Encoding: base64\r\n' +
                '\r\n' +
                'AAECAwQFBg==\r\n' +
                '--ABC--'
        )
    );
});

test('Strange split', (t, done) => {
    let data = [
        'Content-Type: multipart/mixed;\r\n boundary="----sinikael-?=_1-14739302159560.25004998018597235"\r\nX-Laziness-Level: 1000\r\nFrom: Sender Name <test@zone.ee>\r\nTo: Andris Reinman <andris@127.0.0.1>\r\nSubject: Nodemailer is unicode friendly =?UTF-8?Q?=E2=9C=94?=\r\n (1473930215952)\r\nMessage-ID: <def930ed-3708-1dc3-d6b0-f993d9f11941@zone.ee>\r\nX-Mailer: nodemailer (2.6.0; +http://nodemailer.com/;\r\n SMTP/2.7.2[client:2.12.0])\r\nDate: Thu, 15 Sep 2016 09:03:35 +0000\r\nMIME-Version: 1.0',
        '\r\n\r\n------sinikael-?=_1-14739302159560.25004998018597235\r\nContent-Type: multipart/alternative;\r\n boundary="----sinikael-?=_2-14739302159560.25004998018597235"\r\n\r\n------sinikael-?=_2-14739302159560.25004998018597235\r\nContent-Type: text/plain\r\nContent-Transfer-Encoding: 7bit\r\n\r\nHello to myself!\r\n------sinikael-?=_2-14739302159560.25004998018597235\r\nContent-Type: text/watch-html\r\nContent-Transfer-Encoding: 7bit\r\n\r\n<b>Hello</b> to myself\r\n------sinikael-?=_2-14739302159560.25004998018597235\r\nContent-Type: multipart/related; type="text/html";\r\n boundary="----sinikael-?=_5-14739302159560.25004998018597235"'
    ];

    let splitter = new MessageSplitter({
        ignoreEmbedded: true
    });

    splitter.on('data', (/*data */) => {
        //console.log('DATA', JSON.stringify(data.type==='node' ? data.headers.lines : data.value && data.value.toString()));
    });

    splitter.on('end', () => {
        t.assert.ok(1);
        done();
    });

    setTimeout(() => {
        splitter.write(data[0]);
        setTimeout(() => {
            splitter.write(data[1]);
            setTimeout(() => {
                splitter.end();
            }, 1000);
        }, 1000);
    }, 1000);
});

test('Fail on large header', (t, done) => {
    let splitter = new MessageSplitter({
        maxHeadSize: 5
    });

    splitter.on('data', () => {
        t.assert.ok(false);
    });

    splitter.once('error', err => {
        t.assert.ok(err);
        done();
    });

    splitter.once('end', () => {
        t.assert.ok(1);
    });

    splitter.end('Subject: test\nMime-Version: 1.0\n\nHello world!');
});

test('Handle really large header', (t, done) => {
    let splitter = new MessageSplitter({ maxHeadSize: Infinity });

    splitter.on('data', () => {
        t.assert.ok(true);
    });

    splitter.once('error', err => {
        t.assert.ok(!err);
    });

    splitter.once('end', () => {
        t.assert.ok(true);
        done();
    });

    let chunks = [];
    for (let i = 0; i < 100000; i++) {
        chunks.push(Buffer.from('X-Header-' + i + ': some-random-value-' + i + '\r\n'));
    }
    chunks.push(Buffer.from('From: sender@example.com\r\n'));
    chunks.push(Buffer.from('To: receiver@example.com\r\n'));
    chunks.push(Buffer.from('Subject: message with large header\r\n'));
    chunks.push(Buffer.from('\r\n'));
    chunks.push(Buffer.from('Hello world!\r\n'));

    splitter.end(Buffer.concat(chunks));
});

// Feeds a message to a splitter in fixed size writes and collects the parsed
// structure, so that the result can be compared across write chunk sizes. The raw
// bytes come back through a real MessageJoiner rather than being reassembled here.
const splitInChunks = (message, chunkSize, config, callback) => {
    let splitter = new MessageSplitter(config);
    let joiner = new MessageJoiner();
    let nodes = [];
    let raw = [];
    let byNode = new Map();
    let order = [];
    let done = false;

    let failure = null;
    let finish = err => {
        // an error arriving after 'end' still has to reach the caller, otherwise a real
        // regression reports green
        failure = failure || err || null;
        if (done) {
            return;
        }
        done = true;
        callback(failure, {
            nodes,
            raw: Buffer.concat(raw).toString('binary'),
            content: order.map(node => ({
                contentType: node.contentType || '',
                value: Buffer.concat(byNode.get(node)).toString('binary')
            })),
            boundaries: order.map(node => (node._boundary ? node._boundary.toString() : false))
        });
    };

    let track = node => {
        if (!byNode.has(node)) {
            byNode.set(node, []);
            order.push(node);
        }
        return byNode.get(node);
    };

    splitter.on('data', data => {
        if (data.type === 'node') {
            nodes.push(data.contentType || '');
            track(data);
        } else if (data.value && data.type === 'body') {
            track(data.node).push(data.value);
        }
    });

    joiner.on('data', data => raw.push(data));
    joiner.on('end', () => finish(null));
    splitter.on('error', finish);
    joiner.on('error', finish);
    splitter.pipe(joiner);

    let buf = Buffer.from(message, 'binary');
    let pos = 0;
    let feed = () => {
        if (pos >= buf.length) {
            return splitter.end();
        }
        splitter.write(buf.slice(pos, pos + chunkSize));
        pos += chunkSize;
        setImmediate(feed);
    };
    feed();
};

// Asserts that a message parses into the expected content types and that the bytes
// survive a splitter/joiner round trip. `extra` is the number of assertions the
// caller adds in its own callback.
// Write sizes every structural test is checked at, so that a structural claim can never
// hold for one write and fail once the message arrives split across several.
const STRUCTURE_CHUNK_SIZES = [1, 7, 64, 1024];

const testStructure = (t, done, message, expectedNodes, extra, callback) => {
    t.plan(3 + 3 * STRUCTURE_CHUNK_SIZES.length + (extra || 0));
    splitInChunks(message, message.length, undefined, (err, single) => {
        t.assert.ifError(err);
        t.assert.deepStrictEqual(single.nodes, expectedNodes);
        t.assert.strictEqual(single.raw, message);

        let remaining = STRUCTURE_CHUNK_SIZES.slice();
        let next = () => {
            if (!remaining.length) {
                if (callback) {
                    return callback(single);
                }
                return done();
            }
            let chunkSize = remaining.shift();
            splitInChunks(message, chunkSize, undefined, (err2, chunked) => {
                t.assert.ifError(err2);
                t.assert.deepStrictEqual(chunked.nodes, expectedNodes);
                // parsing may not depend on where the writes happened to fall
                t.assert.deepStrictEqual(chunked.content, single.content);
                next();
            });
        };
        next();
    });
};

// Parses the same message at every given write chunk size and runs `assert` on each
// result, so that a test can pin behavior that must not depend on write boundaries.
const forEachChunkSize = (t, done, message, sizes, config, assert) => {
    let remaining = sizes.slice();
    let next = () => {
        if (!remaining.length) {
            return done();
        }
        let chunkSize = remaining.shift();
        splitInChunks(message, chunkSize, config, (err, result) => {
            assert(err, result, chunkSize);
            next();
        });
    };
    next();
};

test('Do not parse nodes after closing boundary', (t, done) => {
    testStructure(
        t,
        done,
        'From: a@b.com\r\n' +
            'Content-Type: multipart/mixed; boundary=BOUND\r\n' +
            '\r\n' +
            '--BOUND\r\n' +
            'Content-Type: text/plain\r\n' +
            '\r\n' +
            'hello\r\n' +
            '--BOUND--\r\n' +
            '\r\n' +
            '--BOUND\r\n' +
            'Content-Type: text/html\r\n' +
            '\r\n' +
            '<b>smuggled?</b>\r\n' +
            '--BOUND--\r\n',
        // the text/html part is epilogue and must not become a node
        ['multipart/mixed', 'text/plain']
    );
});

test('Do not parse nodes after closing boundary of a nested multipart', (t, done) => {
    testStructure(
        t,
        done,
        'Content-Type: multipart/mixed; boundary=OUTER\r\n' +
            '\r\n' +
            '--OUTER\r\n' +
            'Content-Type: multipart/alternative; boundary=INNER\r\n' +
            '\r\n' +
            '--INNER--\r\n' +
            '--OUTER--\r\n' +
            '--OUTER\r\n' +
            'Content-Type: text/html\r\n' +
            '\r\n' +
            '<b>smuggled?</b>\r\n' +
            '--OUTER--\r\n',
        // an unpopped nested multipart may not keep the outer boundary alive
        ['multipart/mixed', 'multipart/alternative']
    );
});

test('Do not parse nodes after closing boundary of an unterminated multipart', (t, done) => {
    testStructure(
        t,
        done,
        'Content-Type: multipart/mixed; boundary=OUTER\r\n' +
            '\r\n' +
            '--OUTER\r\n' +
            'Content-Type: multipart/alternative; boundary=INNER\r\n' +
            '\r\n' +
            '--OUTER--\r\n' +
            '--OUTER\r\n' +
            'Content-Type: text/html\r\n' +
            '\r\n' +
            '<b>smuggled?</b>\r\n' +
            '--OUTER--\r\n',
        ['multipart/mixed', 'multipart/alternative']
    );
});

test('Do not parse nodes after closing boundary of an embedded message', (t, done) => {
    testStructure(
        t,
        done,
        'Content-Type: multipart/mixed; boundary=OUTER\r\n' +
            '\r\n' +
            '--OUTER\r\n' +
            'Content-Type: message/rfc822\r\n' +
            'Content-Disposition: inline\r\n' +
            '\r\n' +
            'Subject: inner\r\n' +
            'Content-Type: multipart/alternative; boundary=INNER\r\n' +
            '\r\n' +
            '--OUTER--\r\n' +
            '--OUTER\r\n' +
            'Content-Type: text/html\r\n' +
            '\r\n' +
            '<b>smuggled?</b>\r\n' +
            '--OUTER--\r\n',
        ['multipart/mixed', 'message/rfc822', 'multipart/alternative']
    );
});

test('Keep parsing siblings after a bogus boundary on a leaf node', (t, done) => {
    testStructure(
        t,
        done,
        'Content-Type: multipart/mixed; boundary=OUTER\r\n' +
            '\r\n' +
            '--OUTER\r\n' +
            'Content-Type: text/plain; boundary=FAKE\r\n' +
            '\r\n' +
            'hello\r\n' +
            '--FAKE\r\n' +
            '--FAKE--\r\n' +
            '--OUTER\r\n' +
            'Content-Type: application/octet-stream\r\n' +
            'Content-Disposition: attachment; filename=payload.bin\r\n' +
            '\r\n' +
            'PAYLOAD\r\n' +
            '--OUTER--\r\n',
        // closing a boundary of a leaf node may not deactivate the real one,
        // the attachment must stay visible to the node stream
        ['multipart/mixed', 'text/plain', 'application/octet-stream']
    );
});

test('Keep parsing parts after a closing boundary in the preamble', (t, done) => {
    testStructure(
        t,
        done,
        'Content-Type: multipart/mixed; boundary=P\r\n' +
            '\r\n' +
            'preamble\r\n' +
            '--P--\r\n' +
            '--P\r\n' +
            'Content-Type: text/plain\r\n' +
            '\r\n' +
            'SECRET\r\n' +
            '--P--\r\n',
        ['multipart/mixed', 'text/plain']
    );
});

test('Keep the boundary of emitted nodes intact', (t, done) => {
    testStructure(
        t,
        done,
        'Content-Type: multipart/mixed; boundary=OUT\r\n' +
            '\r\n' +
            '--OUT\r\n' +
            'Content-Type: multipart/alternative; boundary=IN\r\n' +
            '\r\n' +
            '--IN\r\n' +
            'Content-Type: text/plain\r\n' +
            '\r\n' +
            'plain\r\n' +
            '--IN--\r\n' +
            '--OUT--\r\n',
        ['multipart/mixed', 'multipart/alternative', 'text/plain'],
        1,
        result => {
            // the splitter tracks closed boundaries on its own, the boundary of an
            // already emitted node may not be cleared behind the consumer's back
            t.assert.deepStrictEqual(result.boundaries, ['OUT', 'IN', false]);
            done();
        }
    );
});

test('Attribute body content independently of the write chunk size', (t, done) => {
    let body = 'P'.repeat(120);
    let message = 'Content-Type: multipart/mixed; boundary=BB\r\n\r\n--BB\r\nContent-Type: text/plain\r\n\r\n' + body + '\r\n--BB--\r\n';

    let sizes = [16, 39, 47, 78, 117, 137, 234, 235, 411, 64 * 1024];
    t.plan(sizes.length * 3);

    forEachChunkSize(t, done, message, sizes, undefined, (err, result) => {
        t.assert.ifError(err);
        t.assert.strictEqual(result.raw, message);
        // the trailing line break belongs to the boundary, never to the body
        t.assert.strictEqual(result.content.map(part => part.value).join('|'), '|' + body);
    });
});

test('Flush an overlong body line instead of buffering it', (t, done) => {
    let preamble = 'Content-Type: multipart/mixed; boundary=BB\r\n\r\n--BB\r\nContent-Type: text/plain\r\n\r\n';
    // Sized so that the pending line is flushed exactly at the end of the overlong
    // line when written in 64kB pieces. What follows the flush then looks like a
    // closing delimiter, even though it is the tail of a line that started earlier.
    let chunkSize = 64 * 1024;
    let longLine = 'x'.repeat(3 * chunkSize - preamble.length) + '--BB--';
    let message = preamble + longLine + '\r\n--BB\r\nContent-Type: text/plain\r\n\r\nsecond\r\n--BB--\r\n';

    t.plan(6);
    splitInChunks(message, message.length, undefined, (err, single) => {
        t.assert.ifError(err);
        // the delimiter inside the overlong line is content, the one on its own line is not
        t.assert.deepStrictEqual(single.nodes, ['multipart/mixed', 'text/plain', 'text/plain']);
        t.assert.strictEqual(single.content[1].value, longLine);

        splitInChunks(message, chunkSize, undefined, (err2, chunked) => {
            t.assert.ifError(err2);
            t.assert.strictEqual(chunked.raw, message);
            // flushing a line in pieces may not change what the message parses into
            t.assert.deepStrictEqual(chunked.content, single.content);
            done();
        });
    });
});

test('Fail on oversized single header line while writing', (t, done) => {
    let splitter = new MessageSplitter({
        maxHeadSize: 100
    });

    t.plan(1);

    // the stream is never ended, so report instead of hanging the suite if it is not rejected
    let timer = setTimeout(() => {
        t.assert.strictEqual('not rejected', 'EMAXLEN');
        done();
    }, 2000);

    splitter.on('data', () => {
        t.assert.ok(false, 'no chunk may be emitted for a rejected message');
    });

    splitter.once('error', err => {
        clearTimeout(timer);
        t.assert.strictEqual(err.code, 'EMAXLEN');
        done();
    });

    // a single header line without a line break, exceeding maxHeadSize. The stream is
    // never ended, so this can only be caught while the data is written, not on flush.
    // A line short enough to still turn out to be a delimiter line, with the trailing
    // whitespace one may carry, is kept pending first, so the line has to outgrow that
    splitter.write('Subject: ' + 'h'.repeat(2000));
});

test('Accept a header block closed by a boundary at the size limit', (t, done) => {
    // the closing delimiter is not a header line, so it may not be charged against
    // maxHeadSize, no matter which write it happens to arrive in
    let header = 'X-Pad: ' + 'y'.repeat(80);
    let message = 'Content-Type: multipart/mixed; boundary=B\r\n\r\n--B\r\n' + header + '\r\n--B--\r\n';

    let sizes = [1, 7, 64, 88, 89, 90, 91, 145, 146, 4096];
    t.plan(sizes.length * 2);

    forEachChunkSize(t, done, message, sizes, { maxHeadSize: header.length + 2 }, (err, result) => {
        t.assert.ifError(err);
        t.assert.deepStrictEqual(result.nodes, ['multipart/mixed', 'text/plain']);
    });
});

test('Flush an overlong line in multipart data', (t, done) => {
    // the same guard on a multipart node, where the flushed pieces are structure
    // bytes rather than part content
    let longLine = 'z'.repeat(200 * 1024);
    let message = 'Content-Type: multipart/mixed; boundary=BB\r\n\r\n' + longLine + '\r\n--BB\r\nContent-Type: text/plain\r\n\r\nhi\r\n--BB--\r\n';

    t.plan(5);
    splitInChunks(message, message.length, undefined, (err, single) => {
        t.assert.ifError(err);
        t.assert.deepStrictEqual(single.nodes, ['multipart/mixed', 'text/plain']);

        splitInChunks(message, 8 * 1024, undefined, (err2, chunked) => {
            t.assert.ifError(err2);
            t.assert.strictEqual(chunked.raw, message);
            t.assert.deepStrictEqual(chunked.content, single.content);
            done();
        });
    });
});

test('Handle a closing delimiter without a parent multipart', (t, done) => {
    // nothing to move up to, the delimiter is just content
    testStructure(t, done, 'Subject: t\r\nContent-Type: text/plain\r\n\r\nbody\r\n--NOPE--\r\n', ['text/plain']);
});

test('Count a header line for at least 64 bytes', (t, done) => {
    // a parsed line costs a fixed overhead on top of its bytes, so every line is charged
    // the floor: 20 one byte lines are 60 bytes on the wire and 1280 against the limit
    let message = 'Subject: t\r\n' + 'a\r\n'.repeat(20) + '\r\nbody\r\n';

    t.plan(3);
    splitInChunks(message, 4096, { maxHeadSize: 1000 }, err => {
        t.assert.strictEqual(err && err.code, 'EMAXLEN');
        splitInChunks(message, 4096, { maxHeadSize: 1400 }, (err2, result) => {
            t.assert.ifError(err2);
            t.assert.deepStrictEqual(result.nodes, ['text/plain']);
            done();
        });
    });
});

test('Fail on too many child nodes', (t, done) => {
    let message = 'Content-Type: multipart/mixed; boundary=B\r\n\r\n';
    for (let i = 0; i < 12; i++) {
        message += '--B\r\nContent-Type: text/plain\r\n\r\npart' + i + '\r\n';
    }
    message += '--B--\r\n';

    t.plan(1);
    splitInChunks(message, 4096, { maxChildNodes: 5 }, err => {
        t.assert.strictEqual(err && err.code, 'EMAXLEN');
        done();
    });
});

test('Keep parsing siblings after a bogus boundary on an rfc822 leaf', (t, done) => {
    // a message/rfc822 part that was not inlined is a plain leaf, so it owns the boundary
    // its own boundary= parameter declares. Retiring the enclosing multipart instead would
    // hide every following part, attachments included
    testStructure(
        t,
        done,
        'Content-Type: multipart/mixed; boundary=OUT\r\n' +
            '\r\n' +
            '--OUT\r\n' +
            'Content-Type: message/rfc822; boundary=FOO\r\n' +
            '\r\n' +
            '--FOO\r\n' +
            'Content-Type: text/plain\r\n' +
            '\r\n' +
            'inner\r\n' +
            '--FOO--\r\n' +
            '--OUT\r\n' +
            'Content-Type: application/octet-stream\r\n' +
            'Content-Disposition: attachment; filename=payload.bin\r\n' +
            '\r\n' +
            'PAYLOAD\r\n' +
            '--OUT--\r\n',
        ['multipart/mixed', 'message/rfc822', 'text/plain', 'application/octet-stream']
    );
});

test('Report a body that is only a line ending', (t, done) => {
    // the line ending in front of a delimiter is the delimiter's, but a part whose whole
    // body is that line ending must still report a body, otherwise a rewriter cannot tell
    // an empty part from one it never saw and appends a line break of its own
    let message =
        'Content-Type: multipart/mixed; boundary=B\r\n' +
        '\r\n' +
        '--B\r\n' +
        'Content-Type: text/plain\r\n' +
        '\r\n' +
        '\r\n' +
        '--B\r\n' +
        'Content-Type: text/plain\r\n' +
        '\r\n' +
        'second\r\n' +
        '--B--\r\n';

    t.plan(3);
    let splitter = new MessageSplitter();
    let bodies = [];
    splitter.on('data', data => {
        if (data.type === 'body') {
            bodies.push(data.value.toString('binary'));
        }
    });
    splitter.on('error', err => {
        t.assert.ifError(err);
        done();
    });
    splitter.on('end', () => {
        t.assert.strictEqual(bodies.length, 2, 'both parts must report a body');
        t.assert.strictEqual(bodies[0], '\r\n');
        t.assert.strictEqual(bodies[1], 'second');
        done();
    });
    splitter.end(Buffer.from(message, 'binary'));
});

test('Keep an overlong body line free of a spurious CR', (t, done) => {
    // the flush may not hand out a trailing <CR>, it can still turn out to be the first
    // half of the line ending that belongs to the delimiter behind it
    let lineLen = 65535;
    let line = 'y'.repeat(lineLen);
    let message = 'Content-Type: multipart/mixed; boundary=BB\r\n\r\n--BB\r\nContent-Type: text/plain\r\n\r\n' + line + '\r\n--BB--\r\n';

    let sizes = [1, 16, 100, 1024, 65536];
    t.plan(sizes.length * 2);

    forEachChunkSize(t, done, message, sizes, undefined, (err, result) => {
        t.assert.ifError(err);
        t.assert.strictEqual(result.content[1].value, line);
    });
});

test('Keep parsing siblings after a nested inline message closes', (t, done) => {
    // the child of an inlined message/rfc822 inherits the boundary of that block's own
    // parent, one step up and no further. Resolving the owner by climbing past every
    // inlined block lands on the enclosing multipart and retires a boundary that is still
    // live, which hides every part after it while the bytes still round-trip
    testStructure(
        t,
        done,
        'Content-Type: multipart/mixed; boundary=OUT\r\n' +
            '\r\n' +
            '--OUT\r\n' +
            'Content-Type: message/rfc822; boundary=MID\r\n' +
            'Content-Disposition: inline\r\n' +
            '\r\n' +
            'Content-Type: message/rfc822\r\n' +
            'Content-Disposition: inline\r\n' +
            '\r\n' +
            'Content-Type: text/plain\r\n' +
            '\r\n' +
            'inner body\r\n' +
            '--MID--\r\n' +
            '--OUT\r\n' +
            'Content-Type: application/octet-stream\r\n' +
            'Content-Disposition: attachment; filename=payload.bin\r\n' +
            '\r\n' +
            'PAYLOAD\r\n' +
            '--OUT--\r\n',
        ['multipart/mixed', 'message/rfc822', 'message/rfc822', 'text/plain', 'application/octet-stream']
    );
});

test('Split line-dense input without a setImmediate per line', (t, done) => {
    // A setImmediate per line is linear too, only slow (about 13 us a line), so a timing ratio
    // cannot tell it apart. Count event loop turns instead: a ticker rescheduling itself with
    // setImmediate runs once per turn, which was once per line before lines were batched.
    let lines = 100 * 1000;
    let ticks = 0;
    let running = true;
    let tick = () => {
        if (running) {
            ticks++;
            setImmediate(tick);
        }
    };
    setImmediate(tick);

    let splitter = new MessageSplitter();
    let bodyLength = 0;
    splitter.on('data', data => {
        if (data.type === 'body') {
            bodyLength += data.value.length;
        }
    });
    splitter.on('end', () => {
        running = false;
        t.assert.strictEqual(bodyLength, lines);
        t.assert.ok(ticks < lines / 100, `${ticks} event loop turns for ${lines} lines`);
        done();
    });
    splitter.end(Buffer.from('Subject: test\r\n\r\n' + '\n'.repeat(lines)));
});

test('Yield to the event loop while splitting a large chunk', (t, done) => {
    let splitter = new MessageSplitter();
    let ticks = 0;
    let timer = setInterval(() => ticks++, 0);
    let chunks = 0;
    splitter.on('data', () => chunks++);
    splitter.on('end', () => {
        clearInterval(timer);
        // lines are split in batches, not all at once
        t.assert.ok(chunks > 0);
        t.assert.ok(ticks > 0, 'timers ran while a single large chunk was being split');
        done();
    });
    let line = 'x'.repeat(75) + '\r\n';
    splitter.end(Buffer.from('Subject: test\r\n\r\n' + line.repeat(50 * 1000)));
});

test('Close unterminated nested multiparts on an outer boundary', (t, done) => {
    // neither the innermost nor the middle multipart is closed before the outer delimiter.
    // The attachment after it is a part of the outer multipart, as other parsers and mail
    // clients read it, not body text of the text/plain part
    testStructure(
        t,
        done,
        'Content-Type: multipart/mixed; boundary=b1\r\n' +
            '\r\n' +
            '--b1\r\n' +
            'Content-Type: multipart/alternative; boundary=b2\r\n' +
            '\r\n' +
            '--b2\r\n' +
            'Content-Type: multipart/related; boundary=b3\r\n' +
            '\r\n' +
            '--b3\r\n' +
            'Content-Type: text/plain\r\n' +
            '\r\n' +
            'Hello\r\n' +
            '--b1\r\n' +
            'Content-Type: application/pdf; name=hidden.pdf\r\n' +
            'Content-Disposition: attachment; filename=hidden.pdf\r\n' +
            '\r\n' +
            'JVBERi0=\r\n' +
            '--b1--\r\n',
        ['multipart/mixed', 'multipart/alternative', 'multipart/related', 'text/plain', 'application/pdf'],
        2,
        single => {
            t.assert.deepStrictEqual(single.content, [
                { contentType: 'multipart/mixed', value: '' },
                { contentType: 'multipart/alternative', value: '' },
                { contentType: 'multipart/related', value: '' },
                { contentType: 'text/plain', value: 'Hello' },
                { contentType: 'application/pdf', value: 'JVBERi0=' }
            ]);

            // the attachment is numbered as the second part of the outer multipart
            let splitter = new MessageSplitter();
            let partNumbers = [];
            splitter.on('data', data => {
                if (data.type === 'node') {
                    partNumbers.push([data.contentType, data.partNr.join('.'), data.parentNode ? data.parentNode.contentType : null]);
                }
            });
            splitter.on('end', () => {
                t.assert.deepStrictEqual(partNumbers[4], ['application/pdf', '2', 'multipart/mixed']);
                done();
            });
            splitter.end(Buffer.from(single.raw, 'binary'));
        }
    );
});

test('A boundary holding a non-ASCII character delimits no parts', (t, done) => {
    // A boundary read as latin1 and re-encoded as UTF-8 matched the `--ab\xC3\xA9cd` lines
    // and split out the html part and the attachment under them, which Python, matching no
    // line against such a boundary, leaves unseen. The body now passes through as data
    let message =
        'Content-Type: multipart/mixed; boundary="ab\xe9cd"\r\n\r\n' +
        '--ab\xc3\xa9cd\r\nContent-Type: text/html\r\n\r\n<script>alert(1)</script>\r\n' +
        '--ab\xc3\xa9cd\r\nContent-Type: application/octet-stream; name=x.exe\r\n\r\nMZ\r\n' +
        '--ab\xc3\xa9cd--\r\n';

    testStructure(t, done, message, ['multipart/mixed'], 1, single => {
        // no body chunk belongs to the node, its lines are data
        t.assert.strictEqual(single.content[0].value, '');
        done();
    });
});

test('A boundary followed by a comment delimits the parts', (t, done) => {
    // Python and postal-mime read `boundary=b (comment)` as the boundary b and find the
    // parts, which stayed hidden here while the comment was part of the boundary
    let message =
        'Content-Type: multipart/mixed; boundary=b (comment)\r\n\r\n' +
        '--b\r\nContent-Type: text/html\r\n\r\n<p>html</p>\r\n' +
        '--b\r\nContent-Type: application/octet-stream; name=x.exe\r\n\r\nMZ\r\n' +
        '--b--\r\n';

    testStructure(t, done, message, ['multipart/mixed', 'text/html', 'application/octet-stream']);
});

test('A delimiter line may end in whitespace', (t, done) => {
    // RFC 2046 5.1.1, and Python and postal-mime split by such lines. The boundary value
    // loses its trailing whitespace, so a line written with the space still has to match
    let message =
        'Content-Type: multipart/mixed; boundary="abc "\r\n\r\n' +
        '--abc \r\nContent-Type: text/html\r\n\r\n<p>html</p>\r\n' +
        '--abc\t \r\nContent-Type: application/octet-stream; name=x.exe\r\n\r\nMZ\r\n' +
        '--abc-- \r\n';

    testStructure(t, done, message, ['multipart/mixed', 'text/html', 'application/octet-stream']);
});

test('A delimiter line may not end in anything but whitespace', (t, done) => {
    let message =
        'Content-Type: multipart/mixed; boundary=abc\r\n\r\n' +
        '--abc x\r\nContent-Type: text/html\r\n\r\n<p>html</p>\r\n' +
        '--abc -\r\n' +
        '--abc-\r\n' +
        '--abc--x\r\n' +
        '--abc--\r\n';

    testStructure(t, done, message, ['multipart/mixed']);
});

test('A boundary that opens with a parenthesis delimits the parts', (t, done) => {
    // `boundary=(c)b` is the boundary `(c)b` to Python and postal-mime, so the `--(c)b`
    // lines a sender writes for them delimit the parts here as well, instead of being
    // looked for as `--b` and left as data
    let message =
        'Content-Type: multipart/mixed; boundary=(c)b\r\n\r\n' +
        '--(c)b\r\nContent-Type: text/html\r\n\r\n<p>html</p>\r\n' +
        '--(c)b\r\nContent-Type: application/octet-stream; name=x.exe\r\n\r\nMZ\r\n' +
        '--(c)b--\r\n';

    testStructure(t, done, message, ['multipart/mixed', 'text/html', 'application/octet-stream']);
});

test('A delimiter line may end in a run of carriage returns', (t, done) => {
    // the artifact of a second CR to CRLF conversion, which postal-mime reads as the line
    // ending as well, so the parts behind such lines are found where it finds them
    let message =
        'Content-Type: multipart/mixed; boundary=abc\r\n\r\n' +
        '--abc\r\r\nContent-Type: text/html\r\n\r\n<p>html</p>\r\n' +
        '--abc \r\r\r\nContent-Type: application/octet-stream; name=x.exe\r\n\r\nMZ\r\n' +
        '--abc--\r\r\n' +
        '--abc\r\nContent-Type: text/plain\r\n\r\nepilogue\r\n';

    testStructure(t, done, message, ['multipart/mixed', 'text/html', 'application/octet-stream']);
});

test('What follows a closed quoted boundary is not part of it', (t, done) => {
    // `boundary="b"c` is the boundary b to Python and postal-mime, so the parts under the
    // `--b` lines a sender writes for them are found here as well
    let message =
        'Content-Type: multipart/mixed; boundary="b"c\r\n\r\n' +
        '--b\r\nContent-Type: text/html\r\n\r\n<p>html</p>\r\n' +
        '--b\r\nContent-Type: application/octet-stream; name=x.exe\r\n\r\nMZ\r\n' +
        '--b--\r\n';

    testStructure(t, done, message, ['multipart/mixed', 'text/html', 'application/octet-stream']);
});
