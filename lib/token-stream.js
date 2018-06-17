/*
Copyright (c) 2016, salesforce.com, inc. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

const hexRE = /[A-Fa-f0-9]/

// Takes a predicate function and returns its inverse
let not = (p) => (c) => !p(c)

// Return a function that matches the provided character
let isChar = (c) => (cc) => c === cc

// Return true if the character matches whitespace
let isWhitespace = (c) => '\t\n '.indexOf(c) >= 0

// Return true if the character matches a newline
let isLineBreak = (c) => c === '\n'

// Return true if the character matches an operator
let isOperator = (c) => '+-*/%=&|!~><^'.indexOf(c) >= 0

// Return true if the provided operated can be repeated
let isOperatorRepeatable = (c) => '&|='.indexOf(c) >= 0

// Return true if the character matches a punctuation
let isPunctuation = (c) => ',;(){}[]:#.'.indexOf(c) >= 0

// Return true if the character matches a digit
let isDigit = (c) => /[0-9]/i.test(c)

// Return true if input matches a comment
let isCommentStart = (input) =>
  (input.peek() === '/' && (input.peek(1) === '/' || input.peek(1) === '*'))

// Return true if the character matches the start of an identifier
let isIdentStart = (c) => /[a-z_]/i.test(c)

// Return true if the character matches an identifier
let isIdent = (c) => /[a-z0-9_-]/i.test(c)

// Return true if input matches the start of a number
let isNumberStart = (input) =>
  isDigit(input.peek()) || (input.peek() === '.' && isDigit(input.peek(1)))

// Return the length of a possible hex color
let isHex = (input) => {
  let hex = input.peek()
  if (hex !== '#') {
    return false
  }
  let len = 1
  while (true) {
    let c = input.peek(len)
    if (hexRE.test(c)) {
      hex += c
      if (++len > 7) {
        return false
      }
    } else break
  }
  return len === 7 ? 6 : len === 4 ? 3 : false
}

class TokenStream {
  constructor (input) {
    this.input = input
    this.tokens = []
  }

  all () {
    let tokens = []
    while (!this.eof()) tokens.push(this.next())
    return tokens
  }

  peek (offset) {
    let {tokens} = this
    if (!tokens.length) {
      let token = this._readNext()
      if (token) {
        token[2] = this.input.column - token[4]
        tokens.push(token)
      }
    }
    if (!offset) return tokens[0]
    if (offset < tokens.length) return tokens[offset]
    while (tokens.length <= offset) {
      let token = this._readNext()
      if (token) {
        token[2] = this.input.column - token[4]
        tokens.push(token)
      } else break
    }
    return tokens[offset]
  }

  next () {
    let token = this.tokens.shift()
    if (!token) {
      token = this._readNext()
      if (token) token[2] = this.input.column - token[4]
    }
    return token
  }

  eof () {
    return typeof this.peek() === 'undefined'
  }

  err () {
    return this.input.err(...arguments)
  }

  _token (type) {
    return [
      type,
      null, // value
      0,    // length
      this.input.line,
      this.input.column,
    ]
  }

  _readNext () {
    if (this.input.eof()) return null
    let c = this.input.peek()
    // Whitespace
    if (isWhitespace(c)) {
      return this._readWhitespace()
    }
    // Comments
    if (isCommentStart(this.input)) {
      return this._readComment()
    }
    // Number
    if (isNumberStart(this.input)) {
      return this._readNumber()
    }
    // Hex
    let hex_length = isHex(this.input)
    if (hex_length) {
      return this._readHex(hex_length)
    }
    // Punctutation
    if (isPunctuation(c)) {
      return this._readPunctuation()
    }
    // Identifier
    if (isIdentStart(c)) {
      return this._readIdent()
    }
    // Operator
    if (isOperator(c)) {
      return this._readOperator()
    }
    // String
    if (c === '"' || c === '\'') {
      return this._readString(c)
    }
    // @ keyword
    if (c === '@') {
      return this._readAtRule()
    }
    // Variable
    if (c === '$') {
      return this._readVariable()
    }
    this.err(`Can't handle character: "${c}"`)
  }

  _readWhile (predicate) {
    let s = ''
    while (!this.input.eof() && predicate(this.input.peek())) {
      s += this.input.next()
    }
    return s
  }

  _readEscaped (end) {
    let escaped = false
    let str = ''
    this.input.next()
    while (!this.input.eof()) {
      let c = this.input.next()
      if (escaped) {
        str += c
        escaped = false
      } else if (c === '\\') {
        str += c
        escaped = true
      } else if (c === end) {
        break
      } else {
        str += c
      }
    }
    return str
  }

  _readWhitespace () {
    let tok = this._token('space')
    tok[1] = this._readWhile(isWhitespace)
    return tok
  }

  _readComment () {
    let tok = this._token('comment')
    this.input.next()
    switch (this.input.next()) {
      case '/':
        return this._readCommentSingle(tok)
      case '*':
        return this._readCommentMulti(tok)
    }
  }

  _readCommentSingle (tok) {
    tok[1] = this._readWhile(not(isLineBreak))
    return tok
  }

  _readCommentMulti (tok) {
    let prev = ''
    let value = ''
    while (!this.input.eof()) {
      let next = this.input.next()
      if (next === '/' && prev === '*') break
      value += prev
      prev = next
    }
    tok[1] = value
    return tok
  }

  _readPunctuation () {
    let tok = this._token('punctuation')
    tok[1] = this.input.next()
    return tok
  }

  _readOperator () {
    let tok = this._token('operator')
    let c = this.input.peek()
    tok[1] = isOperatorRepeatable(c)
      ? this._readWhile(isChar(c)) : this.input.next()
    return tok
  }

  _readIdent () {
    let tok = this._token('identifier')
    tok[1] = this._readWhile(isIdent)
    return tok
  }

  _readString (c) {
    let tok = this._token('string')
    tok[1] = this._readEscaped(c)
    return tok
  }

  _readNumber () {
    let tok = this._token('number')
    let whole = true
    tok[1] = this._readWhile(c => {
      if (c === '.') {
        return whole ? !(whole = false) : false
      }
      return isDigit(c)
    })
    return tok
  }

  _readHex (length) {
    let tok = this._token('color_hex')
    this.input.next()
    let value = ''
    for (let i = 0; i < length; i++) {
      value += this.input.next()
    }
    tok[1] = value
    return tok
  }

  _readAtRule () {
    let tok = this._token('atrule')
    this.input.next()
    tok[1] = this._readWhile(isIdent)
    return tok
  }

  _readVariable () {
    let tok = this._token('variable')
    this.input.next()
    tok[1] = this._readWhile(isIdent)
    return tok
  }
}

module.exports = TokenStream
