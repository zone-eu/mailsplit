'use strict';

// Helper class to rewrite nodes with specific mime type

const Transform = require('stream').Transform;
const libmime = require('libmime');

/** @typedef {import('..').FlowedDecoderOptions} FlowedDecoderOptions */

const Libmime = /** @type {any} */ (libmime.Libmime);

/**
 * Really bad "stream" transform to parse format=flowed content
 *
 * @constructor
 * @param {FlowedDecoderOptions} [config]
 */
class FlowedDecoder extends Transform {
    /**
     * @param {FlowedDecoderOptions} [config]
     */
    constructor(config) {
        super();
        this.config = config || {};

        /** @type {Buffer[]} */
        this.chunks = [];
        this.chunklen = 0;

        this.libmime = new Libmime({ Iconv: this.config.Iconv });
    }

    /**
     * @param {Buffer | string} chunk
     * @param {BufferEncoding} encoding
     * @param {import('stream').TransformCallback} callback
     * @returns {void}
     */
    _transform(chunk, encoding, callback) {
        if (!chunk || !chunk.length) {
            return callback();
        }

        if (typeof chunk === 'string') {
            chunk = Buffer.from(chunk, encoding);
        }

        this.chunks.push(chunk);
        this.chunklen += chunk.length;

        callback();
    }

    /**
     * @param {import('stream').TransformCallback} callback
     * @returns {void}
     */
    _flush(callback) {
        if (this.chunklen) {
            let currentBody = Buffer.concat(this.chunks, this.chunklen);

            if (this.config.encoding === 'base64') {
                currentBody = Buffer.from(currentBody.toString('binary'), 'base64');
            }

            let content = this.libmime.decodeFlowed(currentBody.toString('binary'), this.config.delSp);
            this.push(Buffer.from(content, 'binary'));
        }
        return callback();
    }
}

module.exports = FlowedDecoder;
