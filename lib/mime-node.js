'use strict';

const Headers = require('./headers');
const libmime = require('libmime');
const libqp = require('libqp');
// @ts-ignore
const libbase64 = require('libbase64');
const PassThrough = require('stream').PassThrough;
const pathlib = require('path');

/** @typedef {import('..').Headers} HeadersType */
/** @typedef {import('..').PartNumberItem} PartNumberItem */
/** @typedef {import('..').PartNumber} PartNumber */
/** @typedef {import('..').SplitterOptions} SplitterOptions */
/** @typedef {import('libmime').ParsedHeaderValue} StructuredHeader */
/** @typedef {import('stream').Transform | import('stream').PassThrough} ContentStream */
/** @typedef {import('..').MimeNode} MimeNodeType */

const Libmime = /** @type {any} */ (libmime.Libmime);

// The least a header line counts for against maxHeadSize. A parsed line costs a fixed
// overhead on top of its bytes, so 1 MiB of header is at most 16k lines
const HEADER_LINE_MIN_COST = 64;

/**
 * Removes everything from the first `(` to the last `)` of each line, the same result as
 * `value.replace(/\(.*\)/g, '')`, but in linear time. The regex backtracks quadratically
 * on a value with many `(` characters and no closing `)`.
 *
 * Used for the Content-Transfer-Encoding only. The MIME headers with parameters go through
 * libmime's parseHeaderValue with stripComments, which knows where a comment may stand.
 *
 * @param {string} value
 * @returns {string}
 */
function stripComments(value) {
    if (value.indexOf('(') < 0) {
        // the common case, nothing to strip
        return value;
    }
    return value
        .split(/([\n\r\u2028\u2029])/)
        .map(part => {
            let start = part.indexOf('(');
            if (start < 0) {
                return part;
            }
            let end = part.lastIndexOf(')');
            return end > start ? part.slice(0, start) + part.slice(end + 1) : part;
        })
        .join('');
}

/**
 * Parsed MIME node with mutable headers and transfer-encoding helpers.
 */
class MimeNode {
    /**
     * @param {MimeNodeType | false} parentNode Parent node, or false for the root node.
     * @param {SplitterOptions} [config] Splitter and libmime configuration.
     */
    constructor(parentNode, config) {
        /** @type {'node'} */
        this.type = 'node';
        this.root = !parentNode;
        /** @type {MimeNodeType | false} */
        this.parentNode = parentNode;

        /** @type {Buffer | false} */
        this._parentBoundary = this.parentNode && this.parentNode._boundary;
        // the node whose boundary _parentBoundary was copied from, recorded here so that
        // a delimiter for it never has to be matched back to an owner by walking the tree
        /** @type {MimeNodeType | false} */
        this._parentBoundaryOwner = this.parentNode || false;
        /** @type {Buffer[]} */
        this._headersLines = [];
        this._headerlen = 0;
        this._headerCost = 0;

        /** @type {StructuredHeader | false} */
        this._parsedContentType = false;
        /** @type {StructuredHeader | false} */
        this._parsedContentDisposition = false;
        /** @type {Buffer | false} */
        this._boundary = false;

        /** @type {string | false} */
        this.multipart = false;
        /** @type {string | false} */
        this.encoding = false;
        /** @type {HeadersType | false} */
        this.headers = false;
        /** @type {string | false} */
        this.contentType = false;
        /** @type {string | false} */
        this.charset = false;
        /** @type {string | false} */
        this.disposition = false;
        /** @type {string | false} */
        this.filename = false;
        this.flowed = false;
        this.delSp = false;

        this.config = config || {};
        this.libmime = new Libmime({ Iconv: this.config.Iconv });

        /** @type {PartNumber} */
        this.parentPartNumber = [];
        /** @type {PartNumber | false} */
        this.partNr = false; // resolved later
        this.childPartNumbers = 0;
        this.rfc822 = false;
        /** @type {boolean | undefined} */
        this.messageNode = undefined;
    }

    /**
     * @param {PartNumberItem} [provided]
     * @returns {PartNumber}
     */
    getPartNr(provided) {
        /** @type {PartNumber} */
        let partNr = this.partNr || [];
        if (provided) {
            return partNr.filter(nr => !isNaN(Number(nr))).concat(provided);
        }
        let childPartNr = ++this.childPartNumbers;
        return partNr.filter(nr => !isNaN(Number(nr))).concat(childPartNr);
    }

    /**
     * @param {Buffer | false} [line]
     * @returns {boolean} Whether the line is the empty line that ends the header block.
     */
    addHeaderChunk(line) {
        if (!line) {
            return false;
        }
        this._headersLines.push(line);
        this._headerlen += line.length;
        let endsBlock = (line.length === 1 && line[0] === 0x0a) || (line.length === 2 && line[0] === 0x0d && line[1] === 0x0a);
        // the empty line that ends the block costs its bytes, every other line at least the floor
        this._headerCost += endsBlock ? line.length : Math.max(line.length, HEADER_LINE_MIN_COST);
        return endsBlock;
    }

    /**
     * What the header lines of this node count for against maxHeadSize, see HEADER_LINE_MIN_COST.
     *
     * @param {number} [extra] Bytes of a header line that is not stored yet.
     * @returns {number} The cost in bytes.
     */
    headerCost(extra) {
        return this._headerCost + (extra ? Math.max(extra, HEADER_LINE_MIN_COST) : 0);
    }

    /**
     * @returns {void}
     */
    parseHeaders() {
        if (this.headers) {
            return;
        }
        this.headers = new Headers(Buffer.concat(this._headersLines, this._headerlen), this.config);
        // the views held the input chunks alive, the block lives on in the copy
        this._headersLines = [];
        let headers = this.headers;

        // The comments of the MIME headers are dropped, so that `boundary=b (comment)` names
        // the boundary `b` that postal-mime and Python's email.policy.default split by. Read as
        // content, it matched no delimiter line and the parts both of them find stayed hidden
        // here. Python's legacy compat32 policy, the default of message_from_bytes() without a
        // policy, keeps the comment and splits by `--b (comment)` lines instead: a split
        // against it is the price of agreeing with the two readers a renderer is built on
        let dispositionHeader = headers.getFirst('Content-Disposition');
        this._parsedContentDisposition = this.libmime.parseHeaderValue(dispositionHeader, { stripComments: true });
        let parsedContentDisposition = /** @type {StructuredHeader} */ (this._parsedContentDisposition);

        // if content-type is missing default to plaintext
        let contentHeader;
        if (headers.get('Content-Type').length) {
            contentHeader = headers.getFirst('Content-Type');
        } else {
            if (parsedContentDisposition.params.filename) {
                let extension = pathlib.parse(parsedContentDisposition.params.filename).ext.replace(/^\./, '');
                if (extension) {
                    contentHeader = libmime.detectMimeType(extension);
                }
            }
            if (!contentHeader) {
                if (/^attachment$/i.test(parsedContentDisposition.value)) {
                    contentHeader = 'application/octet-stream';
                } else {
                    contentHeader = 'text/plain';
                }
            }
        }

        this._parsedContentType = this.libmime.parseHeaderValue(contentHeader, { stripComments: true });
        let parsedContentType = /** @type {StructuredHeader} */ (this._parsedContentType);

        // The encoding is a bare token, and one written in quotes stays quoted, so that
        // "base64" is not decoded, as Python and postal-mime do not decode it. parseHeaderValue
        // would unquote it, so the transfer encoding keeps its own comment stripper
        this.encoding = stripComments(headers.getFirst('Content-Transfer-Encoding')).toLowerCase().trim();
        this.contentType = (parsedContentType.value || '').toLowerCase().trim() || false;
        this.charset = parsedContentType.params.charset || false;
        this.disposition = (parsedContentDisposition.value || '').toLowerCase().trim() || false;

        // fix invalidly encoded disposition values
        if (this.disposition) {
            try {
                this.disposition = this.libmime.decodeWords(this.disposition);
            } catch (_E) {
                // failed to parse disposition, keep as is (most probably an unknown charset is used)
            }
        }

        this.filename = parsedContentDisposition.params.filename || parsedContentType.params.name || false;

        // format=flowed is defined for text/plain (RFC 3676), and a browser never unfolds an
        // html part. Flagged on any text part, a text/html part with delsp=yes had its
        // `<scri \r\npt>` joined into a script tag by the consumer that unfolded it, a tag
        // neither Python nor a browser given the raw bytes sees
        if (this.contentType === 'text/plain' && parsedContentType.params.format && parsedContentType.params.format.toLowerCase().trim() === 'flowed') {
            this.flowed = true;
            if (parsedContentType.params.delsp && parsedContentType.params.delsp.toLowerCase().trim() === 'yes') {
                this.delSp = true;
            }
        }

        if (this.filename) {
            // A parameter given in RFC 2231 form was decoded by libmime already, which names
            // it in decodedParams, and must not go through decodeWords as well:
            // filename*=utf-8''a%3D%3Futf-8%3FQ%3F%3D2Eexe%3F%3D would otherwise come out as
            // a.exe while a parser that decodes once sees the encoded word. A second scan of
            // the raw header for the name used to decide this, and read `(c)filename*=` as
            // a parameter named `(c)filename` once the comment was dropped from the real one
            let decoded = parsedContentDisposition.params.filename
                ? parsedContentDisposition.decodedParams.includes('filename')
                : parsedContentType.decodedParams.includes('name');
            if (!decoded) {
                try {
                    this.filename = this.libmime.decodeWords(this.filename);
                } catch (_E) {
                    // failed to parse filename, keep as is (most probably an unknown charset is used)
                }
            }
        }

        this.multipart =
            (this.contentType &&
                this.contentType.substr(0, this.contentType.indexOf('/')) === 'multipart' &&
                this.contentType.substr(this.contentType.indexOf('/') + 1)) ||
            false;
        // A boundary is ASCII and does not end in whitespace (RFC 2046 5.1.1, bchars), and
        // Python matches no line against one that is not. One holding a non-ASCII character
        // came out of a header read as latin1 or as UTF-8, and matched under `--ab\xC3\xA9cd`
        // lines parts that a scanner built on Python never saw. Such a boundary counts as
        // none, as a boundary parameter that is missing does. Trailing whitespace is dropped
        // as Python drops it, a delimiter line may end in whitespace anyway
        let boundary = (parsedContentType.params.boundary || '').trimEnd();
        // a non-ASCII character takes more than one byte in UTF-8
        let ascii = Buffer.byteLength(boundary) === boundary.length;
        this._boundary = boundary && ascii ? Buffer.from(boundary) : false;

        this.rfc822 = this.contentType === 'message/rfc822';

        if (!this.parentNode || this.parentNode.rfc822) {
            this.partNr = this.parentNode ? this.parentNode.getPartNr('TEXT') : ['TEXT'];
        } else {
            this.partNr = this.parentNode ? this.parentNode.getPartNr() : [];
        }
    }

    /**
     * @returns {Buffer}
     */
    getHeaders() {
        if (!this.headers) {
            this.parseHeaders();
        }
        let headers = /** @type {HeadersType} */ (this.headers);
        return headers.build();
    }

    /**
     * @param {string | false} [contentType]
     * @returns {void}
     */
    setContentType(contentType) {
        if (!this.headers) {
            this.parseHeaders();
        }
        let headers = /** @type {HeadersType} */ (this.headers);
        let parsedContentType = /** @type {StructuredHeader} */ (this._parsedContentType);

        contentType = (contentType || '').toLowerCase().trim();
        if (contentType) {
            parsedContentType.value = contentType;
        }

        if (!this.flowed && parsedContentType.params.format) {
            delete parsedContentType.params.format;
        }

        if (!this.delSp && parsedContentType.params.delsp) {
            delete parsedContentType.params.delsp;
        }

        headers.update('Content-Type', this.libmime.buildHeaderValue(parsedContentType));
    }

    /**
     * @param {string | false} [charset]
     * @returns {void}
     */
    setCharset(charset) {
        if (!this.headers) {
            this.parseHeaders();
        }
        let headers = /** @type {HeadersType} */ (this.headers);
        let parsedContentType = /** @type {StructuredHeader} */ (this._parsedContentType);

        charset = (charset || '').toLowerCase().trim();

        if (charset === 'ascii') {
            charset = '';
        }

        if (!charset) {
            if (!parsedContentType.value) {
                // nothing to set or update
                return;
            }
            delete parsedContentType.params.charset;
        } else {
            parsedContentType.params.charset = charset;
        }

        if (!parsedContentType.value) {
            parsedContentType.value = 'text/plain';
        }

        headers.update('Content-Type', this.libmime.buildHeaderValue(parsedContentType));
    }

    /**
     * @param {string | false} [filename]
     * @returns {void}
     */
    setFilename(filename) {
        if (!this.headers) {
            this.parseHeaders();
        }
        let headers = /** @type {HeadersType} */ (this.headers);
        let parsedContentType = /** @type {StructuredHeader} */ (this._parsedContentType);
        let parsedContentDisposition = /** @type {StructuredHeader} */ (this._parsedContentDisposition);

        this.filename = (filename || '').toLowerCase().trim();

        if (parsedContentType.params.name) {
            delete parsedContentType.params.name;
            headers.update('Content-Type', this.libmime.buildHeaderValue(parsedContentType));
        }

        if (!this.filename) {
            if (!parsedContentDisposition.value) {
                // nothing to set or update
                return;
            }
            delete parsedContentDisposition.params.filename;
        } else {
            parsedContentDisposition.params.filename = this.filename;
        }

        if (!parsedContentDisposition.value) {
            parsedContentDisposition.value = 'attachment';
        }

        headers.update('Content-Disposition', this.libmime.buildHeaderValue(parsedContentDisposition));
    }

    /**
     * @returns {import('stream').Transform | import('stream').PassThrough}
     */
    getDecoder() {
        if (!this.headers) {
            this.parseHeaders();
        }

        switch (this.encoding) {
            case 'base64':
                return new libbase64.Decoder();
            case 'quoted-printable':
                return new libqp.Decoder();
            default:
                return new PassThrough();
        }
    }

    /**
     * @param {string | false} [encoding]
     * @returns {import('stream').Transform | import('stream').PassThrough}
     */
    getEncoder(encoding) {
        if (!this.headers) {
            this.parseHeaders();
        }
        let headers = /** @type {HeadersType} */ (this.headers);

        encoding = (encoding || '').toString().toLowerCase().trim();

        if (encoding && encoding !== this.encoding) {
            headers.update('Content-Transfer-Encoding', encoding);
        } else {
            encoding = this.encoding;
        }

        switch (encoding) {
            case 'base64':
                return new libbase64.Encoder();
            case 'quoted-printable':
                return new libqp.Encoder();
            default:
                return new PassThrough();
        }
    }
}

module.exports = MimeNode;
