'use strict';

const { test } = require('node:test');

let Headers = require('../lib/headers');
let assertLinear = require('./helpers/assert-linear');

// Parses a built header block back and returns its keys, so that a test can compare what
// build() emits against what the parser reports.
const keysOf = built => new Headers(Buffer.from(built, 'binary')).getList().map(line => line.key);

// The header block ends exactly once, at the very end. An earlier empty line would demote
// every header after it into the message body.
const assertBlockNotClosedEarly = (t, built) => t.assert.ok(!built.slice(0, -4).includes('\r\n\r\n'), 'the header block must not be closed early');

test('Return original headers', (t, done) => {
    let headerStr = 'Subject: test\nMIME-Version: 1.0\nMessage-ID: <abc@def>\n\n';
    let headers = new Headers(Buffer.from(headerStr));
    t.assert.strictEqual(headers.build().toString(), headerStr);
    done();
});

test('Return modified headers', (t, done) => {
    let origHeaderStr = 'Subject: test\nMIME-Version: 1.0\nMessage-ID: <abc@def>\n\n';
    let generatedHeaderStr = 'Subject: test\r\nMIME-Version: 1.0\r\nMessage-ID: <abc@def>\r\n\r\n';
    let headers = new Headers(Buffer.from(origHeaderStr));
    headers._parseHeaders();
    headers.changed = true;
    t.assert.strictEqual(headers.build().toString(), generatedHeaderStr);
    done();
});

test('Return original MBOX headers', (t, done) => {
    let headerStr = 'From MAILER-DAEMON Fri Jul  8 12:08:34 2011\nSubject: test\nMIME-Version: 1.0\nMessage-ID: <abc@def>\n\n';
    let headers = new Headers(Buffer.from(headerStr));
    t.assert.strictEqual(headers.build().toString(), headerStr);
    done();
});

test('Return modified MBOX headers', (t, done) => {
    let origHeaderStr = 'From MAILER-DAEMON Fri Jul  8 12:08:34 2011\nSubject: test\nMIME-Version: 1.0\nMessage-ID: <abc@def>\n\n';
    let generatedHeaderStr = 'From MAILER-DAEMON Fri Jul  8 12:08:34 2011\r\nSubject: test\r\nMIME-Version: 1.0\r\nMessage-ID: <abc@def>\r\n\r\n';
    let headers = new Headers(Buffer.from(origHeaderStr));
    headers._parseHeaders();
    headers.changed = true;
    t.assert.strictEqual(headers.build().toString(), generatedHeaderStr);
    done();
});

test('Get specific headers', (t, done) => {
    let headerStr = 'Subject: test\nX-row: row1\nMIME-Version: 1.0\nX-Row: row2\nX-row: row3\nMessage-ID: <abc@def>\n\n';
    let headers = new Headers(Buffer.from(headerStr));
    t.assert.deepStrictEqual(headers.get('x-row'), ['X-row: row1', 'X-Row: row2', 'X-row: row3']);
    done();
});

test('Get first header value', (t, done) => {
    let headerStr = 'Subject: test\nX-row: row1\nMIME-Version: 1.0\nX-Row: row2\nX-row: row3\nMessage-ID: <abc@def>\n\n';
    let headers = new Headers(Buffer.from(headerStr));
    t.assert.strictEqual(headers.getFirst('x-row'), 'row1');
    done();
});

test('Get header boolean if it exists', (t, done) => {
    let headerStr = 'Subject: test\nX-row: row1\nMIME-Version: 1.0\nX-Row: row2\nX-row: row3\nMessage-ID: <abc@def>\n\n';
    let headers = new Headers(Buffer.from(headerStr));
    t.assert.strictEqual(headers.hasHeader('x-row'), true);
    t.assert.strictEqual(headers.hasHeader('y-row'), false);
    done();
});

test('Get all rows', (t, done) => {
    let headerStr = 'Subject: test\nX-row: row1\nMIME-Version: 1.0\nX-Row: row2\nX-row: row3\nMessage-ID: <abc@def>\n\n';
    let headers = new Headers(Buffer.from(headerStr));
    t.assert.deepStrictEqual(headers.getList('x-row'), [
        {
            key: 'subject',
            line: 'Subject: test'
        },
        {
            key: 'x-row',
            line: 'X-row: row1'
        },
        {
            key: 'mime-version',
            line: 'MIME-Version: 1.0'
        },
        {
            key: 'x-row',
            line: 'X-Row: row2'
        },
        {
            key: 'x-row',
            line: 'X-row: row3'
        },
        {
            key: 'message-id',
            line: 'Message-ID: <abc@def>'
        }
    ]);
    done();
});

test('Add new header', (t, done) => {
    let origHeaderStr = 'Subject: test\nMIME-Version: 1.0\nMessage-ID: <abc@def>\n\n';
    let generatedHeaderStr = 'X-Test: tere\r\nSubject: test\r\nMIME-Version: 1.0\r\nY-Test: foo\r\nMessage-ID: <abc@def>\r\n\r\n';
    let headers = new Headers(Buffer.from(origHeaderStr));
    headers.add('X-Test', 'tere');
    headers.add('Y-Test', 'foo', 3);
    t.assert.strictEqual(
        headers.lines.findIndex(line => line.key === 'y-test'),
        3
    );
    t.assert.strictEqual(headers.build().toString(), generatedHeaderStr);
    done();
});

test('Remove header', (t, done) => {
    let origHeaderStr = 'Subject: test\nMIME-Version: 1.0\nMessage-ID: <abc@def>\n\n';
    let generatedHeaderStr = 'Subject: test\r\nMessage-ID: <abc@def>\r\n\r\n';
    let headers = new Headers(Buffer.from(origHeaderStr));
    headers.remove('MIME-Version');
    t.assert.strictEqual(headers.build().toString(), generatedHeaderStr);
    done();
});

test('Replace header', (t, done) => {
    let origHeaderStr = 'Subject: test\nMIME-Version: 1.0\nMessage-ID: <abc@def>\n\n';
    let generatedHeaderStr = 'Subject: test\r\nMIME-Version: New value\r\nMessage-ID: <abc@def>\r\n\r\n';
    let headers = new Headers(Buffer.from(origHeaderStr));
    headers.update('MIME-Version', 'New value');
    t.assert.strictEqual(headers.build().toString(), generatedHeaderStr);
    done();
});

test('Replace header at relative key index', (t, done) => {
    let origHeaderStr = 'Subject: test\nMIME-Version: 1.0\nMIME-Version: 2.0\nMIME-Version: 3.0\nMessage-ID: <abc@def>\n\n';
    let generatedHeaderStr = 'Subject: test\r\nMIME-Version: 1.0\r\nMIME-Version: New value\r\nMIME-Version: 3.0\r\nMessage-ID: <abc@def>\r\n\r\n';
    let headers = new Headers(Buffer.from(origHeaderStr));
    headers.update('MIME-Version', 'New value', 1);
    t.assert.strictEqual(headers.build().toString(), generatedHeaderStr);
    done();
});

test('Preserve SMTPUTF8 mailbox local part', (t, done) => {
    let value = 'öäöä@wildduck.xn--4caaa.test';
    let headers = new Headers();
    headers.add('From', value);

    t.assert.strictEqual(headers.get('from')[0], `From: ${value}`);
    t.assert.strictEqual(headers.getDecoded('from')[0].value, value);
    t.assert.strictEqual(headers.build().toString(), `From: ${value}\r\n\r\n`);
    done();
});

test('Preserve SMTPUTF8 mailbox with UTF-8 domain', (t, done) => {
    let value = 'öäöä@wildduck.äää.test';
    let headers = new Headers();
    headers.add('From', value);

    t.assert.strictEqual(headers.get('from')[0], `From: ${value}`);
    t.assert.strictEqual(headers.getDecoded('from')[0].value, value);
    t.assert.strictEqual(headers.build().toString(), `From: ${value}\r\n\r\n`);
    done();
});

test('Preserve UTF-8 display name and mailbox', (t, done) => {
    let value = '"Jöhn Dœ" <öäöä@wildduck.xn--4caaa.test>';
    let headers = new Headers();
    headers.add('From', value);

    t.assert.strictEqual(headers.get('from')[0], `From: ${value}`);
    t.assert.strictEqual(headers.getDecoded('from')[0].value, value);
    t.assert.strictEqual(headers.build().toString(), `From: ${value}\r\n\r\n`);
    done();
});

test('Preserve ASCII address round-trip', (t, done) => {
    let value = 'ascii@example.com';
    let headers = new Headers();
    headers.add('From', value);

    t.assert.strictEqual(headers.get('from')[0], `From: ${value}`);
    t.assert.strictEqual(headers.getDecoded('from')[0].value, value);
    t.assert.strictEqual(headers.build().toString(), `From: ${value}\r\n\r\n`);
    done();
});

test('Strip CR and LF from added header values', (t, done) => {
    let headers = new Headers();
    headers.add('X-Test', 'value\rInjected: yes\r\nX-Also: 1\nmore');
    t.assert.strictEqual(headers.build().toString(), 'X-Test: valueInjected: yesX-Also: 1more\r\n\r\n');
    done();
});

test('Drop lone CR from modified headers', (t, done) => {
    // a bare <CR> is not a line break when parsing, so building one into a real line
    // ending would emit a header that was never reported as parsed
    let headers = new Headers(Buffer.from('From: victim@example.com\r\nSubject: hello\rBcc: attacker@example.com\r\nTo: user@example.com\r\n\r\n'));
    headers.add('X-Scan', 'clean');

    let built = headers.build().toString();
    t.assert.strictEqual(built, 'X-Scan: clean\r\nFrom: victim@example.com\r\nSubject: helloBcc: attacker@example.com\r\nTo: user@example.com\r\n\r\n');
    t.assert.deepStrictEqual(keysOf(built).sort(), ['from', 'subject', 'to', 'x-scan']);
    done();
});

test('Drop lone CR that precedes whitespace', (t, done) => {
    // a <CR><SP> at the start of a wire line parses as its own header, so promoting the
    // <CR> to a fold would put a blank line mid block and demote every later header
    // (Subject, DKIM-Signature) into the message body
    let raw = 'From: victim@example.com\r\n\r X: y\r\nSubject: quarterly report\r\nDKIM-Signature: v=1\r\n\r\n';
    let headers = new Headers(Buffer.from(raw, 'binary'));
    headers.add('X-Scan', 'clean');

    let built = headers.build().toString('binary');
    // what is left of the line folds into the header above it, so it adds no header
    t.assert.strictEqual(built, 'X-Scan: clean\r\nFrom: victim@example.com\r\n X: y\r\nSubject: quarterly report\r\nDKIM-Signature: v=1\r\n\r\n');
    // the header block ends exactly once, at the end
    assertBlockNotClosedEarly(t, built);
    t.assert.deepStrictEqual(keysOf(built), ['x-scan', 'from', 'subject', 'dkim-signature']);
    done();
});

test('Keep an indented first header line folded', (t, done) => {
    // ' Bcc: ...' is a continuation, not a header. Making it a header of its own would
    // synthesize an attacker chosen recipient out of input no other parser reads that way
    let headers = new Headers(Buffer.from(' Bcc: attacker@example.com\r\nFrom: victim@example.com\r\nSubject: s\r\n\r\n', 'binary'));
    headers.add('X-Scan', 'clean');

    let keys = keysOf(headers.build().toString('binary'));
    t.assert.deepStrictEqual(keys, ['x-scan', 'from', 'subject']);
    done();
});

test('Keep a whitespace only header line from ending the block', (t, done) => {
    let headers = new Headers(Buffer.from('  \r\nSubject: secret\r\nTo: user@example.com\r\n\r\n', 'binary'));
    headers.add('X-Scan', 'clean');

    let built = headers.build().toString('binary');
    assertBlockNotClosedEarly(t, built);
    t.assert.deepStrictEqual(keysOf(built), ['x-scan', 'subject', 'to']);
    done();
});

test('Drop a leading fold from an added header line', (t, done) => {
    // build() joins lines with the line ending, so a line that starts with one would
    // close the header block
    let headers = new Headers();
    headers.addFormatted('X-Test', '\r\n Bcc: attacker@example.com');
    headers.add('Subject', 'hi');

    let built = headers.build().toString();
    assertBlockNotClosedEarly(t, built);
    // one insertion may never produce more than one header line
    t.assert.strictEqual(new Headers(Buffer.from(built)).getList().length, 2);
    done();
});

test('Keep a trailing CR from ending the header block', (t, done) => {
    let headers = new Headers(Buffer.from('From: a@example.com\r\nSubject: hi\r\r\nTo: user@example.com\r\nX-Important: yes\r\n\r\n'));
    headers.add('Received', 'from localhost');

    let keys = keysOf(headers.build().toString()).sort();
    // an expanded <CR> would close the header block and demote the rest into the body
    t.assert.deepStrictEqual(keys, ['from', 'received', 'subject', 'to', 'x-important']);
    done();
});

test('Strip CR and LF from added header keys', (t, done) => {
    let headers = new Headers();
    headers.add('X-Test\r\nBcc: attacker@example.com', 'ok');

    t.assert.strictEqual(headers.build().toString(), 'X-TestBcc: attacker@example.com: ok\r\n\r\n');
    t.assert.ok(!headers.hasHeader('bcc'));
    done();
});

test('Strip injected header lines from addFormatted', (t, done) => {
    let headers = new Headers();
    headers.addFormatted('X-Test', 'X-Test: value\r\nBcc: attacker@example.com');

    let built = headers.build().toString();
    t.assert.strictEqual(built, 'X-Test: valueBcc: attacker@example.com\r\n\r\n');
    t.assert.deepStrictEqual(keysOf(built), ['x-test']);
    done();
});

test('Keep folded header lines when rebuilding', (t, done) => {
    let headers = new Headers(Buffer.from('Subject: a very long subject\r\n\tthat is folded\r\nTo: user@example.com\r\n\r\n'));
    headers.add('X-Added', 'value');

    // folding is a line break followed by whitespace, it has to survive
    t.assert.strictEqual(headers.build().toString(), 'X-Added: value\r\nSubject: a very long subject\r\n\tthat is folded\r\nTo: user@example.com\r\n\r\n');
    t.assert.strictEqual(headers.build('\n').toString(), 'X-Added: value\nSubject: a very long subject\n\tthat is folded\nTo: user@example.com\n\n');
    done();
});

test('Use lineEnd literally when rebuilding', (t, done) => {
    let headers = new Headers(Buffer.from('Subject: a very long subject\r\n\tthat is folded\r\nX: y\r\n\r\n'));

    // lineEnd is caller supplied, so $&, $` and $' may not act as replacement patterns
    t.assert.strictEqual(headers.build("$'").toString(), "Subject: a very long subject$'\tthat is folded$'X: y$'$'");
    done();
});

test('Keep unmodified headers byte exact', (t, done) => {
    let raw = 'Subject: test\rinjected\r\nTo: user@example.com\r\n\r\n';
    t.assert.strictEqual(new Headers(Buffer.from(raw, 'binary')).build().toString('binary'), raw);
    done();
});

test('Strip injected header lines from supplied header objects', (t, done) => {
    // an array of lines skips _parseHeaders entirely, so build() is the only place
    // that can stop a line supplied by the caller from becoming two headers
    let headers = new Headers([
        { key: 'x-test', line: 'X-Test: value\r\nBcc: attacker@example.com' },
        { key: 'subject', line: 'Subject: hi' }
    ]);

    let built = headers.build().toString();
    t.assert.strictEqual(built, 'X-Test: valueBcc: attacker@example.com\r\nSubject: hi\r\n\r\n');
    t.assert.deepStrictEqual(keysOf(built), ['x-test', 'subject']);
    done();
});

test('Strip injected header lines from a Buffer header line', (t, done) => {
    let headers = new Headers();
    headers.addFormatted('X-Test', Buffer.from('X-Test: value\r\nBcc: attacker@example.com'));

    let built = headers.build().toString();
    t.assert.strictEqual(built, 'X-Test: valueBcc: attacker@example.com\r\n\r\n');
    t.assert.ok(!headers.hasHeader('bcc'));
    done();
});

test('Keep a large folded header block byte exact and parse it', (t, done) => {
    let raw = 'From sender@example.com Mon Jan  1 00:00:00 2024\r\nSubject: first\r\n\tsecond\r\n third\r\nX-A: a\r\nX-B: b\r\n  folded\r\n\r\n';
    let headers = new Headers(Buffer.from(raw, 'binary'));
    t.assert.deepStrictEqual(headers.getList(), [
        { key: 'subject', line: 'Subject: first\r\n\tsecond\r\n third' },
        { key: 'x-a', line: 'X-A: a' },
        { key: 'x-b', line: 'X-B: b\r\n  folded' }
    ]);
    t.assert.strictEqual(headers.mbox, 'From sender@example.com Mon Jan  1 00:00:00 2024');
    t.assert.strictEqual(headers.build().toString('binary'), raw);

    // rebuilding from the parsed lines keeps every fold
    headers.remove('X-A');
    t.assert.strictEqual(headers.build().toString('binary'), raw.replace('X-A: a\r\n', ''));
    done();
});

test('Unfold header continuation lines in linear time', (t, done) => {
    let run = pairs => {
        let raw = Buffer.from('X-A: a\r\n b\r\n'.repeat(pairs) + '\r\n');
        let headers = new Headers(raw);
        t.assert.strictEqual(headers.getList().length, pairs);
        t.assert.ok(headers.build().equals(raw));
    };
    // unfolding with splice took 0.1 s -> 1.2 s here
    assertLinear(t, run, 10 * 1000)
        .catch(err => t.assert.ifError(err))
        .then(() => done());
});

test('Strip trailing line breaks in linear time', (t, done) => {
    let run = count => {
        // a header line made of carriage returns, followed by more headers. A lone CR
        // is not a line break for the parser, so the line is kept as it is
        let line = 'X-A: ' + '\r'.repeat(count);
        let raw = Buffer.from(line + '\r\nX-B: b\r\n\r\n', 'binary');
        let headers = new Headers(raw);
        t.assert.deepStrictEqual(headers.getList(), [
            { key: 'x-a', line },
            { key: 'x-b', line: 'X-B: b' }
        ]);
        t.assert.ok(headers.build().equals(raw));
    };
    // the regex that stripped the trailing line breaks took 0.6 s -> 10 s here
    assertLinear(t, run, 40 * 1000)
        .catch(err => t.assert.ifError(err))
        .then(() => done());
});

test('Find the key of a header line without a colon in linear time', (t, done) => {
    let run = lines => {
        // a line with no colon keeps looking for its key in every continuation line
        let raw = Buffer.from('Subject: a\r\nX\r\n' + ' y\r\n'.repeat(lines) + '\r\n');
        let headers = new Headers(raw);
        let list = headers.getList();
        t.assert.strictEqual(list.length, 2);
        t.assert.strictEqual(list[1].key, '');
        t.assert.ok(headers.build().equals(raw));
    };
    // searching the whole accumulated line for every continuation took 0.4 s -> 7 s here
    assertLinear(t, run, 50 * 1000)
        .catch(err => t.assert.ifError(err))
        .then(() => {
            // the key may still come from a later continuation line
            let headers = new Headers(Buffer.from('X\r\n y\r\n Z-Key: v\r\n more\r\nTo: b\r\n\r\n'));
            t.assert.deepStrictEqual(headers.getList(), [
                { key: 'x\r\n y\r\n z-key', line: 'X\r\n y\r\n Z-Key: v\r\n more' },
                { key: 'to', line: 'To: b' }
            ]);
            done();
        });
});
