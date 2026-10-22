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

test('format=flowed applies to text/plain only', (t, done) => {
    // RFC 3676 defines format=flowed for text/plain, and a browser never unfolds an html
    // part, so `<scri \r\npt>` is no tag to it or to Python. Flagged here, a consumer
    // unfolding the part under delsp=yes joined it into one
    let parse = contentType => {
        let node = new MimeNode();
        node.addHeaderChunk(Buffer.from(`Content-Type: ${contentType}; format=flowed; delsp=yes\r\n`));
        node.addHeaderChunk(Buffer.from('\r\n'));
        node.parseHeaders();
        return node;
    };

    let plain = parse('text/plain');
    t.assert.strictEqual(plain.flowed, true);
    t.assert.strictEqual(plain.delSp, true);

    let html = parse('text/html');
    t.assert.strictEqual(html.flowed, false);
    t.assert.strictEqual(html.delSp, false);

    done();
});

