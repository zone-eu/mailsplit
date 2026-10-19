'use strict';

const { test } = require('node:test');

const Rewriter = require('../lib/node-rewriter');
const Splitter = require('../lib/message-splitter');
const Joiner = require('../lib/message-joiner');
const fs = require('fs');
const crypto = require('crypto');
const PassThrough = require('stream').PassThrough;

test('Recreate message and extract image', (t, done) => {
    let splitter = new Splitter();
    let joiner = new Joiner();
    let msgHash = crypto.createHash('md5');
    let imgHash = crypto.createHash('md5');

    // create a Rewriter for text/html
    let rewriter = new Rewriter(node => node.contentType === 'image/jpeg');
    rewriter.on('node', data => {
        data.decoder.on('data', chunk => {
            imgHash.update(chunk);
        });

        data.decoder.pipe(data.encoder);
    });

    let output = fs
        .createReadStream(__dirname + '/fixtures/large_image.eml')
        .pipe(splitter)
        .pipe(rewriter)
        .pipe(joiner);
    output.on('data', chunk => {
        // use \n newlines
        //chunk = Buffer.from(chunk.toString('binary').replace(/\r/g, ''), 'binary');
        msgHash.update(chunk);
    });
    output.on('end', () => {
        t.assert.strictEqual(msgHash.digest('hex'), 'da699eb48c1aa91088481f1bebc994f2');
        t.assert.strictEqual(imgHash.digest('hex'), '393b91601d78359c99b5b667c2d5dda8');

        done();
    });
    t.plan(2);
});

test('Recreate message with updated format=flow text node', (t, done) => {
    let splitter = new Splitter();
    let joiner = new Joiner();
    let msgHash = crypto.createHash('md5');

    // create a Rewriter for text/html
    let rewriter = new Rewriter(node => node.contentType === 'text/plain' && node.flowed);
    rewriter.on('node', data => {
        let chunks = [];
        data.decoder.on('data', chunk => {
            chunks.push(chunk);
        });
        data.decoder.on('end', () => {
            let str = Buffer.concat(chunks).toString('binary');
            str = '[' + str + ']';
            data.encoder.end(Buffer.from(str, 'binary'));
        });
    });

    let output = fs
        .createReadStream(__dirname + '/fixtures/message.eml')
        .pipe(splitter)
        .pipe(rewriter)
        .pipe(joiner);
    output.on('data', chunk => {
        // normalize to use \n newlines
        chunk = Buffer.from(chunk.toString('binary').replace(/\r/g, ''), 'binary');
        msgHash.update(chunk);
    });
    output.on('end', () => {
        msgHash = msgHash.digest('hex');

        t.assert.strictEqual(msgHash, '2349fd8178018c7886ee47538bb5edbf');

        done();
    });

    t.plan(1);
});

test('Recreate message with large image very slowly', (t, done) => {
    let splitter = new Splitter();
    let joiner = new Joiner();
    let msgHash = crypto.createHash('md5');

    // create a Rewriter for text/html
    let rewriter = new Rewriter(node => node.contentType === 'image/jpeg');
    rewriter.on('node', data => {
        let inputDone = false;
        let reading = false;
        let read = () => {
            setTimeout(() => {
                let chunk = data.decoder.read();
                if (chunk === null) {
                    reading = false;
                    if (inputDone) {
                        data.encoder.end();
                    }
                    return;
                }
                setTimeout(() => {
                    if (!data.encoder.write(chunk)) {
                        data.encoder.once('drain', read);
                    } else {
                        read();
                    }
                }, 100);
            }, 100);
        };

        data.decoder.on('readable', () => {
            if (!reading) {
                reading = true;
                read();
            }
        });

        data.decoder.on('end', () => {
            inputDone = true;
            if (!reading) {
                data.encoder.end();
            }
        });
    });

    let output = fs
        .createReadStream(__dirname + '/fixtures/large_image.eml')
        .pipe(splitter)
        .pipe(rewriter)
        .pipe(joiner);
    output.on('data', chunk => {
        // normalize to use \n newlines
        // chunk = Buffer.from(chunk.toString('binary').replace(/\r/g, ''), 'binary');
        msgHash.update(chunk);
    });
    output.on('end', () => {
        msgHash = msgHash.digest('hex');

        t.assert.strictEqual(msgHash, 'da699eb48c1aa91088481f1bebc994f2');

        done();
    });

    t.plan(1);
});

test('Recreate message with large image one byte at a time', (t, done) => {
    let splitter = new Splitter();
    let joiner = new Joiner();
    let msgHash = crypto.createHash('md5');

    // create a Rewriter for text/html
    let rewriter = new Rewriter(node => node.contentType === 'image/gif');
    rewriter.on('node', data => {
        let inputDone = false;
        let reading = false;
        let read = () => {
            setTimeout(() => {
                let chunk = data.decoder.read(50);
                if (chunk === null) {
                    reading = false;
                    if (inputDone) {
                        data.encoder.end();
                    }
                    return;
                }

                let bytePos = 0;
                let writeNextByte = () => {
                    if (bytePos >= chunk.length) {
                        return read();
                    }
                    let byte = chunk.slice(bytePos++, bytePos);
                    data.encoder.write(byte);
                    setImmediate(writeNextByte);
                };

                writeNextByte();
            }, 100);
        };

        data.decoder.on('readable', () => {
            if (!reading) {
                reading = true;
                read();
            }
        });

        data.decoder.on('end', () => {
            inputDone = true;
            if (!reading) {
                data.encoder.end();
            }
        });
    });

    let fstream = fs.createReadStream(__dirname + '/fixtures/message.eml');
    let input = new PassThrough();

    let inputDone = false;
    let reading = false;
    let read = () => {
        setTimeout(() => {
            let chunk = fstream.read(50);
            if (chunk === null) {
                reading = false;
                if (inputDone) {
                    input.end();
                }
                return;
            }

            let bytePos = 0;
            let writeNextByte = () => {
                if (bytePos >= chunk.length) {
                    return read();
                }
                let byte = chunk.slice(bytePos++, bytePos);
                input.write(byte);
                setImmediate(writeNextByte);
            };

            writeNextByte();
        }, 100);
    };

    fstream.on('readable', () => {
        if (!reading) {
            reading = true;
            read();
        }
    });

    fstream.on('end', () => {
        inputDone = true;
        if (!reading) {
            input.end();
        }
    });

    let output = input.pipe(splitter).pipe(rewriter).pipe(joiner);
    output.on('data', chunk => {
        // normalize to use \n newlines
        chunk = Buffer.from(chunk.toString('binary').replace(/\r/g, ''), 'binary');
        msgHash.update(chunk);
    });
    output.on('end', () => {
        msgHash = msgHash.digest('hex');

        t.assert.strictEqual(msgHash, '1b23ab848c9c6d2edba86e1d5a50bbf2');

        done();
    });

    t.plan(1);
});

test('Decode a base64 format=flowed text node once', (t, done) => {
    let splitter = new Splitter();
    let joiner = new Joiner();

    let text = 'Hello flowed \r\nworld\r\n';
    let message =
        'Content-Type: text/plain; charset=utf-8; format=flowed\r\n' +
        'Content-Transfer-Encoding: base64\r\n' +
        '\r\n' +
        Buffer.from(text).toString('base64') +
        '\r\n';

    let seen;
    let rewriter = new Rewriter(node => node.contentType === 'text/plain');
    rewriter.on('node', data => {
        let chunks = [];
        data.decoder.on('data', chunk => chunks.push(chunk));
        data.decoder.on('end', () => {
            seen = Buffer.concat(chunks).toString();
            data.encoder.end(Buffer.from(seen));
        });
    });

    let output = [];
    splitter.pipe(rewriter).pipe(joiner);
    joiner.on('data', chunk => output.push(chunk));
    joiner.on('end', () => {
        t.assert.strictEqual(seen, 'Hello flowed world');
        t.assert.ok(Buffer.concat(output).toString().includes(Buffer.from(seen).toString('base64')));
        done();
    });
    splitter.end(Buffer.from(message));
});
