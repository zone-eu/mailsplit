'use strict';

const { test } = require('node:test');

const MessageJoiner = require('../lib/message-joiner');

test('Join split message', (t, done) => {
    let joiner = new MessageJoiner();
    let s = '';

    joiner.on('data', data => {
        s += data.toString();
    });

    joiner.on('end', () => {
        t.assert.strictEqual(s, 'Subject: test\r\nMIME-Version: 1.0\r\n\r\nHello world!');
        done();
    });

    joiner.write({
        type: 'data',
        value: 'Subject: test\r\n'
    });

    joiner.write({
        type: 'data',
        value: 'MIME-Version: 1.0\r\n\r\n'
    });

    joiner.end({
        type: 'body',
        value: 'Hello world!'
    });
});
