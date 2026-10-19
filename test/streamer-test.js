'use strict';

const { test } = require('node:test');

const Rewriter = require('../lib/node-streamer');
const Splitter = require('../lib/message-splitter');
const Joiner = require('../lib/message-joiner');
const fs = require('fs');
const crypto = require('crypto');

test('Extract image from message stream', (t, done) => {
    let splitter = new Splitter();
    let joiner = new Joiner();
    let msgHash = crypto.createHash('md5');
    let imgHash = crypto.createHash('md5');

    // create a Streamer for JPEG images
    let streamer = new Rewriter(node => node.contentType === 'image/jpeg');
    streamer.on('node', data => {
        data.decoder.on('data', chunk => {
            imgHash.update(chunk);
        });
        data.decoder.on('end', () => setTimeout(() => data.done(), 2000));
    });

    let output = fs
        .createReadStream(__dirname + '/fixtures/large_image.eml')
        .pipe(splitter)
        .pipe(streamer)
        .pipe(joiner);
    output.on('data', chunk => {
        // use \n newlines
        //chunk = Buffer.from(chunk.toString('binary').replace(/\r/g, ''), 'binary');
        msgHash.update(chunk);
    });
    output.on('end', () => {
        t.assert.strictEqual(msgHash.digest('hex'), '3a5fa4280a54ebfc3ee956fb202a04ea');
        t.assert.strictEqual(imgHash.digest('hex'), '393b91601d78359c99b5b667c2d5dda8');

        done();
    });
    t.plan(2);
});

test('Extract image from message stream and return immediatelly', (t, done) => {
    let splitter = new Splitter();
    let joiner = new Joiner();
    let msgHash = crypto.createHash('md5');
    let imgHash = crypto.createHash('md5');

    // create a Streamer for JPEG images
    let streamer = new Rewriter(node => node.contentType === 'image/jpeg');
    streamer.on('node', data => {
        data.decoder.on('data', chunk => {
            imgHash.update(chunk);
        });
        data.decoder.on('end', () => false);
        data.done();
    });

    let output = fs
        .createReadStream(__dirname + '/fixtures/large_image.eml')
        .pipe(splitter)
        .pipe(streamer)
        .pipe(joiner);
    output.on('data', chunk => {
        // use \n newlines
        //chunk = Buffer.from(chunk.toString('binary').replace(/\r/g, ''), 'binary');
        msgHash.update(chunk);
    });
    output.on('end', () => {
        t.assert.strictEqual(msgHash.digest('hex'), '3a5fa4280a54ebfc3ee956fb202a04ea');
        t.assert.strictEqual(imgHash.digest('hex'), '393b91601d78359c99b5b667c2d5dda8');

        done();
    });
    t.plan(2);
});
