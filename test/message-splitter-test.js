'use strict';

const fs = require('fs');
const crypto = require('crypto');
const MessageSplitter = require('../lib/message-splitter');
const MessageJoiner = require('../lib/message-joiner');
const { Readable, Transform } = require('stream');
const ChunkedPassthrough = require('../lib/chunked-passthrough');

module.exports['Split simple message'] = test => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            test.equal(data.type, 'node');
            test.equal(data.getHeaders().toString(), 'Subject: test\nMime-Version: 1.0\n\n');
        },
        data => {
            test.equal(data.type, 'body');
            test.equal(data.value.toString(), 'Hello world!');
        }
    ];
    test.expect(6);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        test.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        test.done();
    });

    splitter.end('Subject: test\nMime-Version: 1.0\n\nHello world!');
};

module.exports['Split simple message with line ending'] = test => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            test.equal(data.type, 'node');
            test.equal(data.getHeaders().toString(), 'Subject: test\nMime-Version: 1.0\n\n');
        },
        data => {
            test.equal(data.type, 'body');
            test.equal(data.value.toString(), 'Hello world!\r\n');
        }
    ];
    test.expect(6);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        test.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        test.done();
    });

    splitter.end('Subject: test\nMime-Version: 1.0\n\nHello world!\r\n');
};

module.exports['Split message with header only 1'] = test => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            test.equal(data.type, 'node');
            test.equal(data.getHeaders().toString(), 'Subject: test\nMime-Version: 1.0');
        }
    ];
    test.expect(3);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        test.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        test.done();
    });

    splitter.end('Subject: test\nMime-Version: 1.0');
};

module.exports['Split message with header only 2'] = test => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            test.equal(data.type, 'node');
            test.equal(data.getHeaders().toString(), 'Subject: test\nMime-Version: 1.0\n');
        }
    ];
    test.expect(3);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        test.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        test.done();
    });

    splitter.end('Subject: test\nMime-Version: 1.0\n');
};

module.exports['Split message with empty body'] = test => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            test.equal(data.type, 'node');
            test.equal(data.getHeaders().toString(), 'Subject: test\nMime-Version: 1.0\n\n');
        }
    ];
    test.expect(3);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        test.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        test.done();
    });

    splitter.end('Subject: test\nMime-Version: 1.0\n\n');
};

module.exports['Split message with no header'] = test => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            test.equal(data.type, 'node');
            test.equal(data.getHeaders().toString(), '\n');
        },
        data => {
            test.equal(data.type, 'body');
            test.equal(data.value.toString(), 'Hello world!');
        }
    ];
    test.expect(6);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        test.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        test.done();
    });

    splitter.end('\nHello world!');
};

module.exports['Split multipart message'] = test => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            test.equal(data.type, 'node');
            test.equal(
                data.getHeaders().toString(),
                'Content-type: multipart/mixed; boundary=ABC\r\nX-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\nSubject: ABCDEF\r\n\r\n'
            );
        },
        data => {
            test.equal(data.type, 'data');
            test.equal(data.value.toString(), '--ABC\n');
        },
        data => {
            test.equal(data.type, 'node');
            test.equal(
                data.getHeaders().toString(),
                'Content-Type: application/octet-stream\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\x27test.pdf\x27\r\n\r\n'
            );
        },
        data => {
            test.equal(data.type, 'body');
            test.equal(data.value.toString(), 'AAECAwQFBg==');
        },
        data => {
            test.equal(data.type, 'data');
            test.equal(data.value.toString(), '\r\n--ABC--');
        }
    ];
    test.expect(15);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        test.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        test.done();
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
};

module.exports['Split multipart message without terminating boundary'] = test => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            test.equal(data.type, 'node');
            test.equal(
                data.getHeaders().toString(),
                'Content-type: multipart/mixed; boundary=ABC\r\nX-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\nSubject: ABCDEF\r\n\r\n'
            );
        },
        data => {
            test.equal(data.type, 'data');
            test.equal(data.value.toString(), '--ABC\n');
        },
        data => {
            test.equal(data.type, 'node');
            test.equal(
                data.getHeaders().toString(),
                'Content-Type: application/octet-stream\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\x27test.pdf\x27\r\n\r\n'
            );
        },
        data => {
            test.equal(data.type, 'body');
            test.equal(data.value.toString(), 'AAECAwQFBg==');
        }
    ];
    test.expect(12);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        test.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        test.done();
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
};

module.exports['Split and join mimetorture message'] = test => {
    let data = fs.readFileSync(__dirname + '/fixtures/mimetorture.eml');

    let splitter = new MessageSplitter();
    let joiner = new MessageJoiner();

    let chunks = [];

    joiner.on('data', chunk => {
        chunks.push(chunk);
    });

    joiner.on('end', () => {
        test.equal(data.toString('binary'), Buffer.concat(chunks).toString('binary'));
        test.done();
    });

    fs.createReadStream(__dirname + '/fixtures/mimetorture.eml')
        .pipe(splitter)
        .pipe(joiner);
};

module.exports['Fetch attachment from form-data'] = test => {
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
        test.equal(msghash.digest('hex'), 'b6f36ec4e3985a93aee9047ea5c5e835');

        // check attachment hash
        test.equal(hash.digest('hex'), '6c7388d43ad5961b5c042bfbeb25de99');
        test.done();
    });

    fs.createReadStream(__dirname + '/fixtures/form-data.eml').pipe(splitter);
};

module.exports['Split multipart message with embedded message/rfc88'] = test => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            test.equal(data.type, 'node');
            test.equal(
                data.getHeaders().toString(),
                'Content-type: multipart/mixed; boundary=ABC\r\nX-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\nSubject: ABCDEF\r\n\r\n'
            );
        },
        data => {
            test.equal(data.type, 'data');
            test.equal(data.value.toString(), '--ABC\n');
        },
        data => {
            test.equal(data.type, 'node');
            test.equal(data.getHeaders().toString(), 'Content-Type: message/rfc822\r\n\r\n');
        },
        data => {
            test.equal(data.type, 'body');
            test.equal(data.value.toString(), 'Content-Type: text/plain\r\nContent-Transfer-Encoding: base64\r\n\r\nAAECAwQFBg==');
        },
        data => {
            test.equal(data.type, 'data');
            test.equal(data.value.toString(), '\r\n--ABC--');
        }
    ];
    test.expect(15);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        test.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        test.done();
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
};

module.exports['Split multipart message with embedded inline message/rfc88'] = test => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            test.equal(data.type, 'node');
            test.equal(
                data.getHeaders().toString(),
                'Content-type: multipart/mixed; boundary=ABC\r\nX-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\nSubject: ABCDEF\r\n\r\n'
            );
        },
        data => {
            test.equal(data.type, 'data');
            test.equal(data.value.toString(), '--ABC\n');
        },
        data => {
            test.equal(data.type, 'node');
            test.equal(data.getHeaders().toString(), 'Content-Type: message/rfc822\r\nContent-Disposition: inline\r\n\r\n');
        },
        data => {
            test.equal(data.type, 'node');
            test.equal(data.getHeaders().toString(), 'Content-Type: text/plain\r\nContent-Transfer-Encoding: base64\r\n\r\n');
        },
        data => {
            test.equal(data.type, 'body');
            test.equal(data.value.toString(), 'AAECAwQFBg==');
        },
        data => {
            test.equal(data.type, 'data');
            test.equal(data.value.toString(), '\r\n--ABC--');
        }
    ];
    test.expect(18);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        test.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        test.done();
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
};

module.exports['handles line break lines split into 2-byte chunks'] = test => {
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

    test.expect(0);
    test.done();
};

module.exports['Split multipart message with embedded message/rfc822 with header only'] = test => {
    let splitter = new MessageSplitter();

    let tests = [
        data => {
            test.equal(data.type, 'node');
            test.equal(data.getHeaders().toString(), 'Content-Type: multipart/mixed; boundary="ABC"\r\n\r\n');
        },
        data => {
            test.equal(data.type, 'data');
            test.equal(data.value.toString(), '--ABC\r\n');
        },
        data => {
            test.equal(data.type, 'node');
            test.equal(data.getHeaders().toString(), 'Content-Type: message/rfc822\r\n\r\n');
        },
        data => {
            test.equal(data.type, 'body');
            test.equal(data.value.toString(), 'Content-Type: text/plain; charset=utf-8\r\nSubject: OK');
        },
        data => {
            test.equal(data.type, 'data');
            test.equal(data.value.toString(), '\r\n--ABC--');
        }
    ];
    test.expect(15);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        test.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        test.done();
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
};

module.exports['Split multipart message and ignore embedded message/rfc88'] = test => {
    let splitter = new MessageSplitter({
        ignoreEmbedded: true
    });

    let tests = [
        data => {
            test.equal(data.type, 'node');
            test.equal(
                data.getHeaders().toString(),
                'Content-type: multipart/mixed; boundary=ABC\r\nX-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\nSubject: ABCDEF\r\n\r\n'
            );
        },
        data => {
            test.equal(data.type, 'data');
            test.equal(data.value.toString(), '--ABC\n');
        },
        data => {
            test.equal(data.type, 'node');
            test.equal(data.getHeaders().toString(), 'Content-Type: message/rfc822\r\n\r\n');
        },
        data => {
            test.equal(data.type, 'body');
            test.equal(data.value.toString(), 'Content-Type: text/plain\r\nContent-Transfer-Encoding: base64\r\n\r\nAAECAwQFBg==');
        },
        data => {
            test.equal(data.type, 'data');
            test.equal(data.value.toString(), '\r\n--ABC--');
        }
    ];
    test.expect(15);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        test.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        test.done();
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
};

module.exports['Split multipart message and embedded message/rfc88'] = test => {
    let splitter = new MessageSplitter({
        ignoreEmbedded: false,
        defaultInlineEmbedded: true
    });

    let tests = [
        data => {
            test.equal(data.type, 'node');
            test.equal(
                data.getHeaders().toString(),
                'Content-type: multipart/mixed; boundary=ABC\r\nX-Test: =?UTF-8?Q?=C3=95=C3=84?= =?UTF-8?Q?=C3=96=C3=9C?=\r\nSubject: ABCDEF\r\n\r\n'
            );
        },
        data => {
            test.equal(data.type, 'data');
            test.equal(data.value.toString(), '--ABC\n');
        },
        data => {
            test.equal(data.type, 'node');
            test.equal(data.getHeaders().toString(), 'Content-Type: message/rfc822\r\n\r\n');
        },
        data => {
            test.equal(data.type, 'node');
            test.equal(data.getHeaders().toString(), 'Content-Type: text/plain\r\nContent-Transfer-Encoding: base64\r\n\r\n');
        },
        data => {
            test.equal(data.type, 'body');
            test.equal(data.value.toString(), 'AAECAwQFBg==');
        },
        data => {
            test.equal(data.type, 'data');
            test.equal(data.value.toString(), '\r\n--ABC--');
        }
    ];
    test.expect(18);

    splitter.on('data', data => {
        let nextTest = tests.shift();
        test.ok(nextTest);
        nextTest(data);
    });

    splitter.on('end', () => {
        test.done();
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
};

module.exports['Strange split'] = test => {
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
        test.ok(1);
        test.done();
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
};

module.exports['Fail on large header'] = test => {
    let splitter = new MessageSplitter({
        maxHeadSize: 5
    });

    splitter.on('data', () => {
        test.ok(false);
    });

    splitter.once('error', err => {
        test.ok(err);
        test.done();
    });

    splitter.once('end', () => {
        test.ok(1);
    });

    splitter.end('Subject: test\nMime-Version: 1.0\n\nHello world!');
};

module.exports['Handle really large header'] = test => {
    let splitter = new MessageSplitter({ maxHeadSize: Infinity });

    splitter.on('data', () => {
        test.ok(true);
    });

    splitter.once('error', err => {
        test.ok(!err);
    });

    splitter.once('end', () => {
        test.ok(true);
        test.done();
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
};

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

const testStructure = (test, message, expectedNodes, extra, callback) => {
    test.expect(3 + 3 * STRUCTURE_CHUNK_SIZES.length + (extra || 0));
    splitInChunks(message, message.length, undefined, (err, single) => {
        test.ifError(err);
        test.deepEqual(single.nodes, expectedNodes);
        test.equal(single.raw, message);

        let remaining = STRUCTURE_CHUNK_SIZES.slice();
        let next = () => {
            if (!remaining.length) {
                if (callback) {
                    return callback(single);
                }
                return test.done();
            }
            let chunkSize = remaining.shift();
            splitInChunks(message, chunkSize, undefined, (err2, chunked) => {
                test.ifError(err2);
                test.deepEqual(chunked.nodes, expectedNodes);
                // parsing may not depend on where the writes happened to fall
                test.deepEqual(chunked.content, single.content);
                next();
            });
        };
        next();
    });
};

// Parses the same message at every given write chunk size and runs `assert` on each
// result, so that a test can pin behavior that must not depend on write boundaries.
const forEachChunkSize = (test, message, sizes, config, assert) => {
    let remaining = sizes.slice();
    let next = () => {
        if (!remaining.length) {
            return test.done();
        }
        let chunkSize = remaining.shift();
        splitInChunks(message, chunkSize, config, (err, result) => {
            assert(err, result, chunkSize);
            next();
        });
    };
    next();
};

module.exports['Do not parse nodes after closing boundary'] = test => {
    testStructure(
        test,
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
};

module.exports['Do not parse nodes after closing boundary of a nested multipart'] = test => {
    testStructure(
        test,
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
};

module.exports['Do not parse nodes after closing boundary of an unterminated multipart'] = test => {
    testStructure(
        test,
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
};

module.exports['Do not parse nodes after closing boundary of an embedded message'] = test => {
    testStructure(
        test,
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
};

module.exports['Keep parsing siblings after a bogus boundary on a leaf node'] = test => {
    testStructure(
        test,
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
};

module.exports['Keep parsing parts after a closing boundary in the preamble'] = test => {
    testStructure(
        test,
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
};

module.exports['Keep the boundary of emitted nodes intact'] = test => {
    testStructure(
        test,
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
            test.deepEqual(result.boundaries, ['OUT', 'IN', false]);
            test.done();
        }
    );
};

module.exports['Attribute body content independently of the write chunk size'] = test => {
    let body = 'P'.repeat(120);
    let message = 'Content-Type: multipart/mixed; boundary=BB\r\n\r\n--BB\r\nContent-Type: text/plain\r\n\r\n' + body + '\r\n--BB--\r\n';

    let sizes = [16, 39, 47, 78, 117, 137, 234, 235, 411, 64 * 1024];
    test.expect(sizes.length * 3);

    forEachChunkSize(test, message, sizes, undefined, (err, result) => {
        test.ifError(err);
        test.equal(result.raw, message);
        // the trailing line break belongs to the boundary, never to the body
        test.equal(result.content.map(part => part.value).join('|'), '|' + body);
    });
};

module.exports['Flush an overlong body line instead of buffering it'] = test => {
    let preamble = 'Content-Type: multipart/mixed; boundary=BB\r\n\r\n--BB\r\nContent-Type: text/plain\r\n\r\n';
    // Sized so that the pending line is flushed exactly at the end of the overlong
    // line when written in 64kB pieces. What follows the flush then looks like a
    // closing delimiter, even though it is the tail of a line that started earlier.
    let chunkSize = 64 * 1024;
    let longLine = 'x'.repeat(3 * chunkSize - preamble.length) + '--BB--';
    let message = preamble + longLine + '\r\n--BB\r\nContent-Type: text/plain\r\n\r\nsecond\r\n--BB--\r\n';

    test.expect(6);
    splitInChunks(message, message.length, undefined, (err, single) => {
        test.ifError(err);
        // the delimiter inside the overlong line is content, the one on its own line is not
        test.deepEqual(single.nodes, ['multipart/mixed', 'text/plain', 'text/plain']);
        test.equal(single.content[1].value, longLine);

        splitInChunks(message, chunkSize, undefined, (err2, chunked) => {
            test.ifError(err2);
            test.equal(chunked.raw, message);
            // flushing a line in pieces may not change what the message parses into
            test.deepEqual(chunked.content, single.content);
            test.done();
        });
    });
};

module.exports['Fail on oversized single header line while writing'] = test => {
    let splitter = new MessageSplitter({
        maxHeadSize: 100
    });

    test.expect(1);

    // the stream is never ended, so report instead of hanging the suite if it is not rejected
    let timer = setTimeout(() => {
        test.equal('not rejected', 'EMAXLEN');
        test.done();
    }, 2000);

    splitter.on('data', () => {
        test.ok(false, 'no chunk may be emitted for a rejected message');
    });

    splitter.once('error', err => {
        clearTimeout(timer);
        test.equal(err.code, 'EMAXLEN');
        test.done();
    });

    // a single header line without a line break, exceeding maxHeadSize. The stream is
    // never ended, so this can only be caught while the data is written, not on flush
    splitter.write('Subject: ' + 'h'.repeat(500));
};

module.exports['Accept a header block closed by a boundary at the size limit'] = test => {
    // the closing delimiter is not a header line, so it may not be charged against
    // maxHeadSize, no matter which write it happens to arrive in
    let header = 'X-Pad: ' + 'y'.repeat(80);
    let message = 'Content-Type: multipart/mixed; boundary=B\r\n\r\n--B\r\n' + header + '\r\n--B--\r\n';

    let sizes = [1, 7, 64, 88, 89, 90, 91, 145, 146, 4096];
    test.expect(sizes.length * 2);

    forEachChunkSize(test, message, sizes, { maxHeadSize: header.length + 2 }, (err, result) => {
        test.ifError(err);
        test.deepEqual(result.nodes, ['multipart/mixed', 'text/plain']);
    });
};

module.exports['Flush an overlong line in multipart data'] = test => {
    // the same guard on a multipart node, where the flushed pieces are structure
    // bytes rather than part content
    let longLine = 'z'.repeat(200 * 1024);
    let message = 'Content-Type: multipart/mixed; boundary=BB\r\n\r\n' + longLine + '\r\n--BB\r\nContent-Type: text/plain\r\n\r\nhi\r\n--BB--\r\n';

    test.expect(5);
    splitInChunks(message, message.length, undefined, (err, single) => {
        test.ifError(err);
        test.deepEqual(single.nodes, ['multipart/mixed', 'text/plain']);

        splitInChunks(message, 8 * 1024, undefined, (err2, chunked) => {
            test.ifError(err2);
            test.equal(chunked.raw, message);
            test.deepEqual(chunked.content, single.content);
            test.done();
        });
    });
};

module.exports['Handle a closing delimiter without a parent multipart'] = test => {
    // nothing to move up to, the delimiter is just content
    testStructure(test, 'Subject: t\r\nContent-Type: text/plain\r\n\r\nbody\r\n--NOPE--\r\n', ['text/plain']);
};

module.exports['Fail on too many child nodes'] = test => {
    let message = 'Content-Type: multipart/mixed; boundary=B\r\n\r\n';
    for (let i = 0; i < 12; i++) {
        message += '--B\r\nContent-Type: text/plain\r\n\r\npart' + i + '\r\n';
    }
    message += '--B--\r\n';

    test.expect(1);
    splitInChunks(message, 4096, { maxChildNodes: 5 }, err => {
        test.equal(err && err.code, 'EMAXLEN');
        test.done();
    });
};

module.exports['Keep parsing siblings after a bogus boundary on an rfc822 leaf'] = test => {
    // a message/rfc822 part that was not inlined is a plain leaf, so it owns the boundary
    // its own boundary= parameter declares. Retiring the enclosing multipart instead would
    // hide every following part, attachments included
    testStructure(
        test,
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
};

module.exports['Report a body that is only a line ending'] = test => {
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

    test.expect(3);
    let splitter = new MessageSplitter();
    let bodies = [];
    splitter.on('data', data => {
        if (data.type === 'body') {
            bodies.push(data.value.toString('binary'));
        }
    });
    splitter.on('error', err => {
        test.ifError(err);
        test.done();
    });
    splitter.on('end', () => {
        test.equal(bodies.length, 2, 'both parts must report a body');
        test.equal(bodies[0], '\r\n');
        test.equal(bodies[1], 'second');
        test.done();
    });
    splitter.end(Buffer.from(message, 'binary'));
};

module.exports['Keep an overlong body line free of a spurious CR'] = test => {
    // the flush may not hand out a trailing <CR>, it can still turn out to be the first
    // half of the line ending that belongs to the delimiter behind it
    let lineLen = 65535;
    let line = 'y'.repeat(lineLen);
    let message = 'Content-Type: multipart/mixed; boundary=BB\r\n\r\n--BB\r\nContent-Type: text/plain\r\n\r\n' + line + '\r\n--BB--\r\n';

    let sizes = [1, 16, 100, 1024, 65536];
    test.expect(sizes.length * 2);

    forEachChunkSize(test, message, sizes, undefined, (err, result) => {
        test.ifError(err);
        test.equal(result.content[1].value, line);
    });
};

module.exports['Keep parsing siblings after a nested inline message closes'] = test => {
    // the child of an inlined message/rfc822 inherits the boundary of that block's own
    // parent, one step up and no further. Resolving the owner by climbing past every
    // inlined block lands on the enclosing multipart and retires a boundary that is still
    // live, which hides every part after it while the bytes still round-trip
    testStructure(
        test,
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
};
