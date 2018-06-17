// Copyright (c) 2015-present, salesforce.com, inc. All rights reserved
// Licensed under BSD 3-Clause - see LICENSE.txt or git.io/sfdc-license

/* eslint-env jest */

const tokenize = require('..')

describe('#peek', () => {
  it('returns the current token', () => {
    let t = tokenize('hello')
    expect(t.peek()).toMatchSnapshot()
  })
  it('returns the current token with an offset', () => {
    let t = tokenize('hello world')
    expect(t.peek(1)).toMatchSnapshot()
  })
})

describe('#next', () => {
  it('consumes returns and the next token', () => {
    let t = tokenize('hello world')
    expect(t.next()).toMatchSnapshot()
    expect(t.peek()).toMatchSnapshot()
  })
  describe('tokens', () => {
    describe('space', () => {
      it('single space', () => {
        let t = tokenize(' ')
        expect(t.next()).toMatchSnapshot()
      })
      it('multiple spaces', () => {
        let t = tokenize('    hello')
        expect(t.next()).toMatchSnapshot()
      })
      it('whitespace characters', () => {
        let t = tokenize('\n\n\t  hello')
        expect(t.next()).toMatchSnapshot()
      })
    })
    describe('comment', () => {
      it('single comment', () => {
        let t = tokenize('// Hello\nWorld')
        expect(t.next()).toMatchSnapshot()
      })
      it('single comment', () => {
        let t = tokenize('/** Hello World */')
        expect(t.next()).toMatchSnapshot()
      })
    })
    describe('number', () => {
      it('integer', () => {
        let t = tokenize('3')
        expect(t.next()).toMatchSnapshot()
      })
      it('float', () => {
        let t = tokenize('3.0')
        expect(t.next()).toMatchSnapshot()
      })
      it('float (leading decimal)', () => {
        let t = tokenize('.3')
        expect(t.next()).toMatchSnapshot()
      })
    })
    describe('hex', () => {
      it('6 digit lowercase', () => {
        let t = tokenize('#ff0099')
        expect(t.next()).toMatchSnapshot()
      })
      it('6 digit uppercase', () => {
        let t = tokenize('#FF0099')
        expect(t.next()).toMatchSnapshot()
      })
      it('3 digit lowercase', () => {
        let t = tokenize('#ff0')
        expect(t.next()).toMatchSnapshot()
      })
      it('3 digit uppercase', () => {
        let t = tokenize('#FF0')
        expect(t.next()).toMatchSnapshot()
      })
      it('3 digit (trailing invalid)', () => {
        let t = tokenize('#FF0;')
        expect(t.next()).toMatchSnapshot()
      })
      it('6 digit numbers', () => {
        let t = tokenize('#000000')
        expect(t.next()).toMatchSnapshot()
      })
    })
    describe('atrule', () => {
      it('works', () => {
        let t = tokenize('@mixin')
        expect(t.next()).toMatchSnapshot()
      })
    })
    describe('punctuation', () => {
      it('{', () => {
        let t = tokenize('{')
        expect(t.next()).toMatchSnapshot()
      })
    })
    describe('operator', () => {
      it('+', () => {
        let t = tokenize('+')
        expect(t.next()).toMatchSnapshot()
      })
      it('repeatable', () => {
        let t = tokenize('&&')
        expect(t.next()).toMatchSnapshot()
      })
      it('non-repeatable', () => {
        let t = tokenize('++')
        expect(t.next()).toMatchSnapshot()
      })
      it('repeatable followed by non-repeatable', () => {
        let t = tokenize('&++')
        expect(t.next()).toMatchSnapshot()
      })
    })
    describe('identifier', () => {
      it('checks for valid starting characters', () => {
        let t = tokenize('_hello world')
        expect(t.next()).toMatchSnapshot()
      })
      it('ignores invalid starting characters', () => {
        let t = tokenize('0hello world')
        expect(t.next()).toMatchSnapshot()
      })
    })
    describe('string', () => {
      it('single quotes', () => {
        let t = tokenize('\'hello\'')
        expect(t.next()).toMatchSnapshot()
      })
      it('double quotes', () => {
        let t = tokenize('"hello"')
        expect(t.next()).toMatchSnapshot()
      })
      it('escaped characters', () => {
        let t = tokenize('"hello \\"world\\""')
        expect(t.next()).toMatchSnapshot()
      })
      it('preserves escape characters', () => {
        let t = createTokenStream(createInputStream('token(\'\'+myVar+\'font(\\\'world\\\')\')'))
        expect(t.all()).toMatchSnapshot()
      })
    })
    describe('variable', () => {
      it('works', () => {
        let t = tokenize('$size')
        expect(t.next()).toMatchSnapshot()
      })
    })
    describe('sink', () => {
      it('1', () => {
        let t = createTokenStream(createInputStream('($var)'))
        expect(t.all()).toMatchSnapshot()
      })
      it('2', () => {
        let t = createTokenStream(createInputStream('// ($var)\n@mixin myMixin'))
        expect(t.all()).toMatchSnapshot()
      })
    })
  })
})

describe('#eof', () => {
  it('returns false if there are more tokens', () => {
    let t = tokenize('hello')
    expect(t.eof()).toEqual(false)
  })
  it('returns true if there are no more tokens', () => {
    let t = tokenize('hello world')
    expect(t.eof()).toEqual(false)
    t.next()
    t.next()
    t.next()
    expect(t.eof()).toEqual(true)
  })
})

describe('#err', () => {
  it('throws an error', () => {
    let t = tokenize('hello world')
    t.next()
    t.next()
    expect(() => {
      t.err('Whoops')
    }).toThrow(/Whoops \(1:6\)/)
  })
})
