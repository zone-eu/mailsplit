'use strict';

let Headers = require('../lib/headers');

// Parses a built header block back and returns its keys, so that a test can compare what
// build() emits against what the parser reports.
const keysOf = built => new Headers(Buffer.from(built, 'binary')).getList().map(line => line.key);

// The header block ends exactly once, at the very end. An earlier empty line would demote
// every header after it into the message body.
const assertBlockNotClosedEarly = (test, built) => test.ok(!built.slice(0, -4).includes('\r\n\r\n'), 'the header block must not be closed early');

module.exports['Return original headers'] = test => {
    let headerStr = 'Subject: test\nMIME-Version: 1.0\nMessage-ID: <abc@def>\n\n';
    let headers = new Headers(Buffer.from(headerStr));
    test.equal(headers.build().toString(), headerStr);
    test.done();
};

module.exports['Return modified headers'] = test => {
    let origHeaderStr = 'Subject: test\nMIME-Version: 1.0\nMessage-ID: <abc@def>\n\n';
    let generatedHeaderStr = 'Subject: test\r\nMIME-Version: 1.0\r\nMessage-ID: <abc@def>\r\n\r\n';
    let headers = new Headers(Buffer.from(origHeaderStr));
    headers._parseHeaders();
    headers.changed = true;
    test.equal(headers.build().toString(), generatedHeaderStr);
    test.done();
};

module.exports['Return original MBOX headers'] = test => {
    let headerStr = 'From MAILER-DAEMON Fri Jul  8 12:08:34 2011\nSubject: test\nMIME-Version: 1.0\nMessage-ID: <abc@def>\n\n';
    let headers = new Headers(Buffer.from(headerStr));
    test.equal(headers.build().toString(), headerStr);
    test.done();
};

module.exports['Return modified MBOX headers'] = test => {
    let origHeaderStr = 'From MAILER-DAEMON Fri Jul  8 12:08:34 2011\nSubject: test\nMIME-Version: 1.0\nMessage-ID: <abc@def>\n\n';
    let generatedHeaderStr = 'From MAILER-DAEMON Fri Jul  8 12:08:34 2011\r\nSubject: test\r\nMIME-Version: 1.0\r\nMessage-ID: <abc@def>\r\n\r\n';
    let headers = new Headers(Buffer.from(origHeaderStr));
    headers._parseHeaders();
    headers.changed = true;
    test.equal(headers.build().toString(), generatedHeaderStr);
    test.done();
};

module.exports['Get specific headers'] = test => {
    let headerStr = 'Subject: test\nX-row: row1\nMIME-Version: 1.0\nX-Row: row2\nX-row: row3\nMessage-ID: <abc@def>\n\n';
    let headers = new Headers(Buffer.from(headerStr));
    test.deepEqual(headers.get('x-row'), ['X-row: row1', 'X-Row: row2', 'X-row: row3']);
    test.done();
};

module.exports['Get first header value'] = test => {
    let headerStr = 'Subject: test\nX-row: row1\nMIME-Version: 1.0\nX-Row: row2\nX-row: row3\nMessage-ID: <abc@def>\n\n';
    let headers = new Headers(Buffer.from(headerStr));
    test.equal(headers.getFirst('x-row'), 'row1');
    test.done();
};

module.exports['Get header boolean if it exists'] = test => {
    let headerStr = 'Subject: test\nX-row: row1\nMIME-Version: 1.0\nX-Row: row2\nX-row: row3\nMessage-ID: <abc@def>\n\n';
    let headers = new Headers(Buffer.from(headerStr));
    test.equal(headers.hasHeader('x-row'), true);
    test.equal(headers.hasHeader('y-row'), false);
    test.done();
};

module.exports['Get all rows'] = test => {
    let headerStr = 'Subject: test\nX-row: row1\nMIME-Version: 1.0\nX-Row: row2\nX-row: row3\nMessage-ID: <abc@def>\n\n';
    let headers = new Headers(Buffer.from(headerStr));
    test.deepEqual(headers.getList('x-row'), [
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
    test.done();
};

module.exports['Add new header'] = test => {
    let origHeaderStr = 'Subject: test\nMIME-Version: 1.0\nMessage-ID: <abc@def>\n\n';
    let generatedHeaderStr = 'X-Test: tere\r\nSubject: test\r\nMIME-Version: 1.0\r\nY-Test: foo\r\nMessage-ID: <abc@def>\r\n\r\n';
    let headers = new Headers(Buffer.from(origHeaderStr));
    headers.add('X-Test', 'tere');
    headers.add('Y-Test', 'foo', 3);
    test.equal(
        headers.lines.findIndex(line => line.key === 'y-test'),
        3
    );
    test.equal(headers.build().toString(), generatedHeaderStr);
    test.done();
};

module.exports['Remove header'] = test => {
    let origHeaderStr = 'Subject: test\nMIME-Version: 1.0\nMessage-ID: <abc@def>\n\n';
    let generatedHeaderStr = 'Subject: test\r\nMessage-ID: <abc@def>\r\n\r\n';
    let headers = new Headers(Buffer.from(origHeaderStr));
    headers.remove('MIME-Version');
    test.equal(headers.build().toString(), generatedHeaderStr);
    test.done();
};

module.exports['Replace header'] = test => {
    let origHeaderStr = 'Subject: test\nMIME-Version: 1.0\nMessage-ID: <abc@def>\n\n';
    let generatedHeaderStr = 'Subject: test\r\nMIME-Version: New value\r\nMessage-ID: <abc@def>\r\n\r\n';
    let headers = new Headers(Buffer.from(origHeaderStr));
    headers.update('MIME-Version', 'New value');
    test.equal(headers.build().toString(), generatedHeaderStr);
    test.done();
};

module.exports['Replace header at relative key index'] = test => {
    let origHeaderStr = 'Subject: test\nMIME-Version: 1.0\nMIME-Version: 2.0\nMIME-Version: 3.0\nMessage-ID: <abc@def>\n\n';
    let generatedHeaderStr = 'Subject: test\r\nMIME-Version: 1.0\r\nMIME-Version: New value\r\nMIME-Version: 3.0\r\nMessage-ID: <abc@def>\r\n\r\n';
    let headers = new Headers(Buffer.from(origHeaderStr));
    headers.update('MIME-Version', 'New value', 1);
    test.equal(headers.build().toString(), generatedHeaderStr);
    test.done();
};

module.exports['Preserve SMTPUTF8 mailbox local part'] = test => {
    let value = 'öäöä@wildduck.xn--4caaa.test';
    let headers = new Headers();
    headers.add('From', value);

    test.equal(headers.get('from')[0], `From: ${value}`);
    test.equal(headers.getDecoded('from')[0].value, value);
    test.equal(headers.build().toString(), `From: ${value}\r\n\r\n`);
    test.done();
};

module.exports['Preserve SMTPUTF8 mailbox with UTF-8 domain'] = test => {
    let value = 'öäöä@wildduck.äää.test';
    let headers = new Headers();
    headers.add('From', value);

    test.equal(headers.get('from')[0], `From: ${value}`);
    test.equal(headers.getDecoded('from')[0].value, value);
    test.equal(headers.build().toString(), `From: ${value}\r\n\r\n`);
    test.done();
};

module.exports['Preserve UTF-8 display name and mailbox'] = test => {
    let value = '"Jöhn Dœ" <öäöä@wildduck.xn--4caaa.test>';
    let headers = new Headers();
    headers.add('From', value);

    test.equal(headers.get('from')[0], `From: ${value}`);
    test.equal(headers.getDecoded('from')[0].value, value);
    test.equal(headers.build().toString(), `From: ${value}\r\n\r\n`);
    test.done();
};

module.exports['Preserve ASCII address round-trip'] = test => {
    let value = 'ascii@example.com';
    let headers = new Headers();
    headers.add('From', value);

    test.equal(headers.get('from')[0], `From: ${value}`);
    test.equal(headers.getDecoded('from')[0].value, value);
    test.equal(headers.build().toString(), `From: ${value}\r\n\r\n`);
    test.done();
};

module.exports['Strip CR and LF from added header values'] = test => {
    let headers = new Headers();
    headers.add('X-Test', 'value\rInjected: yes\r\nX-Also: 1\nmore');
    test.equal(headers.build().toString(), 'X-Test: valueInjected: yesX-Also: 1more\r\n\r\n');
    test.done();
};

module.exports['Drop lone CR from modified headers'] = test => {
    // a bare <CR> is not a line break when parsing, so building one into a real line
    // ending would emit a header that was never reported as parsed
    let headers = new Headers(Buffer.from('From: victim@example.com\r\nSubject: hello\rBcc: attacker@example.com\r\nTo: user@example.com\r\n\r\n'));
    headers.add('X-Scan', 'clean');

    let built = headers.build().toString();
    test.equal(built, 'X-Scan: clean\r\nFrom: victim@example.com\r\nSubject: helloBcc: attacker@example.com\r\nTo: user@example.com\r\n\r\n');
    test.deepEqual(keysOf(built).sort(), ['from', 'subject', 'to', 'x-scan']);
    test.done();
};

module.exports['Drop lone CR that precedes whitespace'] = test => {
    // a <CR><SP> at the start of a wire line parses as its own header, so promoting the
    // <CR> to a fold would put a blank line mid block and demote every later header
    // (Subject, DKIM-Signature) into the message body
    let raw = 'From: victim@example.com\r\n\r X: y\r\nSubject: quarterly report\r\nDKIM-Signature: v=1\r\n\r\n';
    let headers = new Headers(Buffer.from(raw, 'binary'));
    headers.add('X-Scan', 'clean');

    let built = headers.build().toString('binary');
    // what is left of the line folds into the header above it, so it adds no header
    test.equal(built, 'X-Scan: clean\r\nFrom: victim@example.com\r\n X: y\r\nSubject: quarterly report\r\nDKIM-Signature: v=1\r\n\r\n');
    // the header block ends exactly once, at the end
    assertBlockNotClosedEarly(test, built);
    test.deepEqual(keysOf(built), ['x-scan', 'from', 'subject', 'dkim-signature']);
    test.done();
};

module.exports['Keep an indented first header line folded'] = test => {
    // ' Bcc: ...' is a continuation, not a header. Making it a header of its own would
    // synthesize an attacker chosen recipient out of input no other parser reads that way
    let headers = new Headers(Buffer.from(' Bcc: attacker@example.com\r\nFrom: victim@example.com\r\nSubject: s\r\n\r\n', 'binary'));
    headers.add('X-Scan', 'clean');

    let keys = keysOf(headers.build().toString('binary'));
    test.deepEqual(keys, ['x-scan', 'from', 'subject']);
    test.done();
};

module.exports['Keep a whitespace only header line from ending the block'] = test => {
    let headers = new Headers(Buffer.from('  \r\nSubject: secret\r\nTo: user@example.com\r\n\r\n', 'binary'));
    headers.add('X-Scan', 'clean');

    let built = headers.build().toString('binary');
    assertBlockNotClosedEarly(test, built);
    test.deepEqual(keysOf(built), ['x-scan', 'subject', 'to']);
    test.done();
};

module.exports['Drop a leading fold from an added header line'] = test => {
    // build() joins lines with the line ending, so a line that starts with one would
    // close the header block
    let headers = new Headers();
    headers.addFormatted('X-Test', '\r\n Bcc: attacker@example.com');
    headers.add('Subject', 'hi');

    let built = headers.build().toString();
    assertBlockNotClosedEarly(test, built);
    // one insertion may never produce more than one header line
    test.equal(new Headers(Buffer.from(built)).getList().length, 2);
    test.done();
};

module.exports['Keep a trailing CR from ending the header block'] = test => {
    let headers = new Headers(Buffer.from('From: a@example.com\r\nSubject: hi\r\r\nTo: user@example.com\r\nX-Important: yes\r\n\r\n'));
    headers.add('Received', 'from localhost');

    let keys = keysOf(headers.build().toString()).sort();
    // an expanded <CR> would close the header block and demote the rest into the body
    test.deepEqual(keys, ['from', 'received', 'subject', 'to', 'x-important']);
    test.done();
};

module.exports['Strip CR and LF from added header keys'] = test => {
    let headers = new Headers();
    headers.add('X-Test\r\nBcc: attacker@example.com', 'ok');

    test.equal(headers.build().toString(), 'X-TestBcc: attacker@example.com: ok\r\n\r\n');
    test.ok(!headers.hasHeader('bcc'));
    test.done();
};

module.exports['Strip injected header lines from addFormatted'] = test => {
    let headers = new Headers();
    headers.addFormatted('X-Test', 'X-Test: value\r\nBcc: attacker@example.com');

    let built = headers.build().toString();
    test.equal(built, 'X-Test: valueBcc: attacker@example.com\r\n\r\n');
    test.deepEqual(keysOf(built), ['x-test']);
    test.done();
};

module.exports['Keep folded header lines when rebuilding'] = test => {
    let headers = new Headers(Buffer.from('Subject: a very long subject\r\n\tthat is folded\r\nTo: user@example.com\r\n\r\n'));
    headers.add('X-Added', 'value');

    // folding is a line break followed by whitespace, it has to survive
    test.equal(headers.build().toString(), 'X-Added: value\r\nSubject: a very long subject\r\n\tthat is folded\r\nTo: user@example.com\r\n\r\n');
    test.equal(headers.build('\n').toString(), 'X-Added: value\nSubject: a very long subject\n\tthat is folded\nTo: user@example.com\n\n');
    test.done();
};

module.exports['Use lineEnd literally when rebuilding'] = test => {
    let headers = new Headers(Buffer.from('Subject: a very long subject\r\n\tthat is folded\r\nX: y\r\n\r\n'));

    // lineEnd is caller supplied, so $&, $` and $' may not act as replacement patterns
    test.equal(headers.build("$'").toString(), "Subject: a very long subject$'\tthat is folded$'X: y$'$'");
    test.done();
};

module.exports['Keep unmodified headers byte exact'] = test => {
    let raw = 'Subject: test\rinjected\r\nTo: user@example.com\r\n\r\n';
    test.equal(new Headers(Buffer.from(raw, 'binary')).build().toString('binary'), raw);
    test.done();
};

module.exports['Strip injected header lines from supplied header objects'] = test => {
    // an array of lines skips _parseHeaders entirely, so build() is the only place
    // that can stop a line supplied by the caller from becoming two headers
    let headers = new Headers([
        { key: 'x-test', line: 'X-Test: value\r\nBcc: attacker@example.com' },
        { key: 'subject', line: 'Subject: hi' }
    ]);

    let built = headers.build().toString();
    test.equal(built, 'X-Test: valueBcc: attacker@example.com\r\nSubject: hi\r\n\r\n');
    test.deepEqual(keysOf(built), ['x-test', 'subject']);
    test.done();
};

module.exports['Strip injected header lines from a Buffer header line'] = test => {
    let headers = new Headers();
    headers.addFormatted('X-Test', Buffer.from('X-Test: value\r\nBcc: attacker@example.com'));

    let built = headers.build().toString();
    test.equal(built, 'X-Test: valueBcc: attacker@example.com\r\n\r\n');
    test.ok(!headers.hasHeader('bcc'));
    test.done();
};
