'use strict';

const { test } = require('node:test');

let MimeNode = require('../lib/mime-node');
let assertLinear = require('./helpers/assert-linear');

test('Add and parse headers', (t, done) => {
    let mimeNode = new MimeNode();

    mimeNode.addHeaderChunk(Buffer.from('Subject: test\r\n'));
    mimeNode.addHeaderChunk(Buffer.from(' jne\r\n'));
    mimeNode.addHeaderChunk(Buffer.from('X-Mailer: 12345\r\n'));
    mimeNode.addHeaderChunk(Buffer.from('\r\n'));

    mimeNode.parseHeaders();

    t.assert.strictEqual(mimeNode.getHeaders().toString(), 'Subject: test\r\n jne\r\nX-Mailer: 12345\r\n\r\n');

    done();
});

test('Update Content-Type', (t, done) => {
    let mimeNode = new MimeNode();

    mimeNode.addHeaderChunk(Buffer.from('Subject: test\r\n'));
    mimeNode.addHeaderChunk(Buffer.from(' jne\r\n'));
    mimeNode.addHeaderChunk(Buffer.from('Content-Type: text/plain;\r\n'));
    mimeNode.addHeaderChunk(Buffer.from(' boundary="abc"\r\n'));
    mimeNode.addHeaderChunk(Buffer.from('X-Mailer: 12345\r\n'));
    mimeNode.addHeaderChunk(Buffer.from('\r\n'));

    mimeNode.parseHeaders();

    mimeNode.setContentType('image/png');

    t.assert.strictEqual(mimeNode.getHeaders().toString(), 'Subject: test\r\n jne\r\nContent-Type: image/png; boundary=abc\r\nX-Mailer: 12345\r\n\r\n');

    done();
});

test('Get filename from Content-Type', (t, done) => {
    let mimeNode = new MimeNode();

    mimeNode.addHeaderChunk(
        Buffer.from(
            'Content-Type: application/octet-stream; name="=?UTF-8?Q?=C3=95=C3=84=C3=96=C3=9C?="\r\nContent-Transfer-Encoding: QUOTED-PRINTABLE\r\n\r\n'
        )
    );

    mimeNode.parseHeaders();
    t.assert.strictEqual(mimeNode.disposition, false);
    t.assert.strictEqual(mimeNode.filename, 'ÕÄÖÜ');
    done();
});

test('Get split filename from Content-Type', (t, done) => {
    let mimeNode = new MimeNode();

    mimeNode.addHeaderChunk(
        Buffer.from(
            'Content-Type: application/octet-stream;\r\n' +
                "    name*0*=UTF-8''%C3%95%C3%84;\r\n" +
                '    name*1*=%C3%96%C3%9C\r\n' +
                'Content-Transfer-Encoding: QUOTED-PRINTABLE\r\n\r\n'
        )
    );

    mimeNode.parseHeaders();
    t.assert.strictEqual(mimeNode.filename, 'ÕÄÖÜ');
    done();
});

test('Get filename from Content-Disposition', (t, done) => {
    let mimeNode = new MimeNode();

    mimeNode.addHeaderChunk(
        Buffer.from('Content-Disposition: inline; filename="=?UTF-8?Q?=C3=95=C3=84=C3=96=C3=9C?="\r\nContent-Transfer-Encoding: QUOTED-PRINTABLE\r\n\r\n')
    );

    mimeNode.parseHeaders();
    t.assert.strictEqual(mimeNode.disposition, 'inline');
    t.assert.strictEqual(mimeNode.filename, 'ÕÄÖÜ');
    done();
});

test('Get split filename from Content-Disposition', (t, done) => {
    let mimeNode = new MimeNode();

    mimeNode.addHeaderChunk(
        Buffer.from(
            'Content-Disposition:attachment;\r\n' +
                "    filename*0*=UTF-8''%C3%95%C3%84;\r\n" +
                '    filename*1*=%C3%96%C3%9C\r\n' +
                'Content-Transfer-Encoding: QUOTED-PRINTABLE\r\n\r\n'
        )
    );

    mimeNode.parseHeaders();
    t.assert.strictEqual(mimeNode.disposition, 'attachment');
    t.assert.strictEqual(mimeNode.filename, 'ÕÄÖÜ');
    done();
});

test('Set filename', (t, done) => {
    let mimeNode = new MimeNode();

    mimeNode.addHeaderChunk(
        Buffer.from(
            'Content-Disposition:attachment;\r\n' +
                "    filename*0*=UTF-8''%C3%95%C3%84;\r\n" +
                '    filename*1*=%C3%96%C3%9C\r\n' +
                'Content-Transfer-Encoding: QUOTED-PRINTABLE\r\n\r\n'
        )
    );

    mimeNode.parseHeaders();

    mimeNode.setFilename('jõgeva.txt');

    t.assert.strictEqual(
        mimeNode.getHeaders().toString(),
        "Content-Disposition: attachment; filename*0*=utf-8''j%C3%B5geva.txt\r\nContent-Transfer-Encoding: QUOTED-PRINTABLE\r\n\r\n"
    );

    done();
});

test('Delete filename', (t, done) => {
    let mimeNode = new MimeNode();

    mimeNode.addHeaderChunk(
        Buffer.from(
            'Content-Disposition:attachment;\r\n' +
                "    filename*0*=UTF-8''%C3%95%C3%84;\r\n" +
                '    filename*1*=%C3%96%C3%9C\r\n' +
                'Content-Transfer-Encoding: QUOTED-PRINTABLE\r\n\r\n'
        )
    );

    mimeNode.parseHeaders();

    mimeNode.setFilename(false);
    t.assert.strictEqual(mimeNode.getHeaders().toString(), 'Content-Disposition: attachment\r\nContent-Transfer-Encoding: QUOTED-PRINTABLE\r\n\r\n');
    done();
});

test('Update existing filename', (t, done) => {
    let mimeNode = new MimeNode();

    mimeNode.addHeaderChunk(Buffer.from('Subject: test\r\n'));
    mimeNode.addHeaderChunk(Buffer.from(' jne\r\n'));
    mimeNode.addHeaderChunk(Buffer.from('Content-Type: text/plain;\r\n'));
    mimeNode.addHeaderChunk(Buffer.from(' boundary="abc"\r\n'));
    mimeNode.addHeaderChunk(Buffer.from('X-Mailer: 12345\r\n'));
    mimeNode.addHeaderChunk(Buffer.from('\r\n'));

    mimeNode.parseHeaders();

    mimeNode.setFilename('jõgeva.txt');
    t.assert.strictEqual(
        mimeNode.getHeaders().toString(),
        'Content-Disposition: attachment; filename*0*=utf-8\'\'j%C3%B5geva.txt\r\nSubject: test\r\n jne\r\nContent-Type: text/plain;\r\n boundary="abc"\r\nX-Mailer: 12345\r\n\r\n'
    );
    done();
});

test('Set character set', (t, done) => {
    let mimeNode = new MimeNode();

    mimeNode.addHeaderChunk(Buffer.from('Subject: test\r\n\r\n'));

    mimeNode.parseHeaders();

    mimeNode.setCharset('utf-8');
    t.assert.strictEqual(mimeNode.getHeaders().toString(), 'Content-Type: text/plain; charset=utf-8\r\nSubject: test\r\n\r\n');
    done();
});

test('Update character set', (t, done) => {
    let mimeNode = new MimeNode();

    mimeNode.addHeaderChunk(Buffer.from('Content-Type: text/plain; charset=utf-8\r\nSubject: test\r\n\r\n'));

    mimeNode.parseHeaders();

    mimeNode.setCharset('ISO-8859-1');
    t.assert.strictEqual(mimeNode.getHeaders().toString(), 'Content-Type: text/plain; charset=iso-8859-1\r\nSubject: test\r\n\r\n');
    done();
});

test('Remove character set', (t, done) => {
    let mimeNode = new MimeNode();

    mimeNode.addHeaderChunk(Buffer.from('Content-Type: text/plain; charset=utf-8\r\nSubject: test\r\n\r\n'));

    mimeNode.parseHeaders();

    mimeNode.setCharset('ascii');
    t.assert.strictEqual(mimeNode.getHeaders().toString(), 'Content-Type: text/plain\r\nSubject: test\r\n\r\n');
    done();
});

test('Strip comments from Content-Transfer-Encoding', (t, done) => {
    let values = ['base64', 'base64 (comment)', '(comment) Base64', 'quoted-printable (a) x (b)', 'base64 (unclosed', 'base64 ) (', '7bit ()'];
    for (let value of values) {
        let mimeNode = new MimeNode();
        mimeNode.addHeaderChunk(Buffer.from('Content-Transfer-Encoding: ' + value + '\r\n\r\n'));
        mimeNode.parseHeaders();
        // same result as the regex this replaced
        t.assert.strictEqual(
            mimeNode.encoding,
            value
                .replace(/\(.*\)/g, '')
                .toLowerCase()
                .trim(),
            value
        );
    }
    done();
});

test('Parse Content-Transfer-Encoding with many comment openers in linear time', (t, done) => {
    let run = size => {
        let mimeNode = new MimeNode();
        mimeNode.addHeaderChunk(Buffer.from('Content-Transfer-Encoding: base64 ' + '('.repeat(size) + '\r\n\r\n'));
        mimeNode.parseHeaders();
        t.assert.strictEqual(mimeNode.encoding, 'base64 ' + '('.repeat(size));
    };
    // the backtracking regex took 0.05 s -> 0.7 s here
    assertLinear(t, run, 10 * 1000)
        .catch(err => t.assert.ifError(err))
        .then(() => done());
});

test('Do not decode an RFC 2231 filename a second time', (t, done) => {
    // each value spells out an encoded word once decoded. libmime decodes the RFC 2231
    // form itself, so a second pass would turn the result into "invoice.exe"
    let cases = [
        ["Content-Disposition: attachment; filename*=utf-8''invoice%3D%3Futf-8%3FQ%3F%3D2Eexe%3F%3D\r\n\r\n", 'invoice=?utf-8?Q?=2Eexe?='],
        [
            "Content-Disposition: attachment;\r\n filename*0*=utf-8''invoice%3D%3Futf-8;\r\n filename*1*=%3FQ%3F%3D2Eexe%3F%3D\r\n\r\n",
            'invoice=?utf-8?Q?=2Eexe?='
        ],
        ["Content-Type: application/pdf; name*=utf-8''invoice%3D%3Futf-8%3FQ%3F%3D2Eexe%3F%3D\r\n\r\n", 'invoice=?utf-8?Q?=2Eexe?='],
        // a plain parameter is still decoded, and a quoted value can not hide the RFC 2231 form in it
        ['Content-Disposition: attachment; filename="=?utf-8?Q?invoice=2Etxt?="\r\n\r\n', 'invoice.txt'],
        ['Content-Type: application/pdf; name="=?utf-8?Q?invoice=2Epdf?="\r\n\r\n', 'invoice.pdf'],
        ['Content-Disposition: attachment; filename="=?utf-8?Q?a=2Etxt?=; filename*=x"\r\n\r\n', 'a.txt; filename*=x']
    ];
    for (let [header, filename] of cases) {
        let mimeNode = new MimeNode();
        mimeNode.addHeaderChunk(Buffer.from(header));
        mimeNode.parseHeaders();
        t.assert.strictEqual(mimeNode.filename, filename, header);
    }
    done();
});

// a node parsed from one header block, given as a binary string
const parseHeader = header => {
    let node = new MimeNode();
    node.addHeaderChunk(Buffer.from(header + '\r\n\r\n', 'binary'));
    node.parseHeaders();
    return node;
};

test('format=flowed applies to text/plain only', (t, done) => {
    // RFC 3676 defines it for text/plain, and a browser never unfolds an html part
    let plain = parseHeader('Content-Type: text/plain; format=flowed; delsp=yes');
    t.assert.strictEqual(plain.flowed, true);
    t.assert.strictEqual(plain.delSp, true);

    let html = parseHeader('Content-Type: text/html; format=flowed; delsp=yes');
    t.assert.strictEqual(html.flowed, false);
    t.assert.strictEqual(html.delSp, false);

    done();
});

test('a boundary is ASCII without trailing whitespace', (t, done) => {
    let boundary = value => parseHeader(`Content-Type: multipart/mixed; boundary="${value}"`)._boundary;

    t.assert.strictEqual(boundary('abc  ').toString(), 'abc');
    t.assert.strictEqual(boundary("b#$@'()+_,-./:=?").toString(), "b#$@'()+_,-./:=?");
    // a latin1 byte, and the same character in UTF-8
    t.assert.strictEqual(boundary('ab\xe9cd'), false);
    t.assert.strictEqual(boundary('ab\xc3\xa9cd'), false);
    t.assert.strictEqual(boundary('   '), false);

    done();
});

test('the comments of a MIME header are dropped and the first of a duplicated parameter wins', (t, done) => {
    // as Python and postal-mime read them, so the boundary they split by is the one split by here
    let boundary = header => parseHeader(header)._boundary.toString();

    t.assert.strictEqual(boundary('Content-Type: multipart/mixed; boundary=b (comment)'), 'b');
    t.assert.strictEqual(boundary('Content-Type: multipart/mixed; boundary=b; boundary=c'), 'b');
    t.assert.strictEqual(boundary('Content-Type: (c) multipart/mixed (c); (c) boundary= (c)"b" (c)'), 'b');
    // right behind the "=" a parenthesis is content, as it is for Python and postal-mime
    t.assert.strictEqual(boundary('Content-Type: multipart/mixed; boundary=(c)b'), '(c)b');
    // what follows a closed quoted string is junk, not part of the boundary
    t.assert.strictEqual(boundary('Content-Type: multipart/mixed; boundary="b"c (c)'), 'b');
    // a parenthesis that continues a token is content
    t.assert.strictEqual(parseHeader('Content-Disposition: attachment; filename=Invoice(1).pdf').filename, 'Invoice(1).pdf');
    t.assert.strictEqual(parseHeader('Content-Disposition: attachment; filename="a (1).pdf" (c)').filename, 'a (1).pdf');

    done();
});

test('an RFC 2231 parameter is told apart by what libmime decoded, not by a second scan', (t, done) => {
    // libmime decodes the continuation while parsing, so the result must not go through
    // decodeWords again: once decoded, a%3D%3Futf-8%3FQ%3F%3D2Eexe%3F%3D is the name
    // a=?utf-8?Q?=2Eexe?= that Python and postal-mime show, twice decoded it is a.exe. A
    // second scan of the raw header for the name read `(c)filename*=` as `(c)filename`
    // once the comment was dropped from the real parameter, and decoded it again
    let encoded = "utf-8''a%3D%3Futf-8%3FQ%3F%3D2Eexe%3F%3D";
    let once = 'a=?utf-8?Q?=2Eexe?=';
    t.assert.strictEqual(parseHeader(`Content-Disposition: attachment; filename*=${encoded}`).filename, once);
    t.assert.strictEqual(parseHeader(`Content-Disposition: attachment; (c)filename*=${encoded}`).filename, once);
    t.assert.strictEqual(parseHeader(`Content-Disposition: attachment; filename*(c)=${encoded}`).filename, once);
    t.assert.strictEqual(parseHeader(`Content-Disposition: attachment; (c;c) filename*0*=${encoded}`).filename, once);
    t.assert.strictEqual(parseHeader(`Content-Type: application/octet-stream; (c)name*=${encoded}`).filename, once);
    // a plain parameter holding an encoded word is still decoded once
    t.assert.strictEqual(parseHeader('Content-Disposition: attachment; (c)filename="=?utf-8?Q?a=2Etxt?="').filename, 'a.txt');
    done();
});
