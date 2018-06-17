/*
Copyright (c) 2016, salesforce.com, inc. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

const isEmpty = require('lodash.isempty')

const HEX_PATTERN = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

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
  if (hex === '#') {
    let _3 = false
    let _6 = false
    while (hex.length < 7) {
      let c = input.peek(hex.length)
      if (isEmpty(c)) break
      hex += c
      if (hex.length === 4) _3 = HEX_PATTERN.test(hex)
      if (hex.length === 7) _6 = HEX_PATTERN.test(hex)
    }
    return _6 ? 6 : _3 ? 3 : false
  }
  return false
}

class TokenStream {
  constructor (input) {
    this.input = input
    this.tokens = []
  }

  peek (offset) {
    if (!this.tokens.length) {
      let token = this._readNext()
      if (token) this.tokens.push(token)
    }
    if (!offset) return this.tokens[0]
    if (offset < this.tokens.length) return this.tokens[offset]
    while (this.tokens.length <= offset) {
      let token = this._readNext()
      if (token) this.tokens.push(token)
      else break
    }
    return this.tokens[offset]
  }

  next () {
    let token = this.tokens.shift()
    return token || this._readNext()
  }

  eof () {
    return typeof this.peek() === 'undefined'
  }

  err () {
    return this.input.err(...arguments)
  }

  _createToken (type, value, start) {
    return Object.freeze({
      type,
      value,
      start,
      next: this.input.position()
    })
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
    let start = this.input.position()
    let value = this._readWhile(isWhitespace)
    return this._createToken('space', value, start)
  }

  _readComment () {
    let start = this.input.position()
    this.input.next()
    switch (this.input.next()) {
      case '/':
        return this._readCommentSingle(start)
      case '*':
        return this._readCommentMulti(start)
    }
  }

  _readCommentSingle (start) {
    let value = this._readWhile(not(isLineBreak))
    return this._createToken('comment', value, start)
  }

  _readCommentMulti (start) {
    let prev = ''
    let value = ''
    while (!this.input.eof()) {
      let next = this.input.next()
      if (next === '/' && prev === '*') break
      value += prev
      prev = next
    }
    return this._createToken('comment', value, start)
  }

  _readPunctuation () {
    let start = this.input.position()
    let value = this.input.next()
    return this._createToken('punctuation', value, start)
  }

  _readOperator () {
    let start = this.input.position()
    let c = this.input.peek()
    let value = isOperatorRepeatable(c)
      ? this._readWhile(isChar(c)) : this.input.next()
    return this._createToken('operator', value, start)
  }

  _readIdent () {
    let start = this.input.position()
    let value = this._readWhile(isIdent)
    return this._createToken('identifier', value, start)
  }

  _readString (c) {
    let start = this.input.position()
    let value = this._readEscaped(c)
    let type = 'string'
    if (c === '"') type = 'string_double'
    if (c === '\'') type = 'string_single'
    return this._createToken(type, value, start)
  }

  _readNumber () {
    let start = this.input.position()
    let hasPoint = false
    let value = this._readWhile((c) => {
      if (c === '.') {
        if (hasPoint) return false
        hasPoint = true
        return true
      }
      return isDigit(c)
    })
    return this._createToken('number', value, start)
  }

  _readHex (length) {
    let start = this.input.position()
    this.input.next()
    let value = ''
    for (let i = 0; i < length; i++) {
      value += this.input.next()
    }
    return this._createToken('color_hex', value, start)
  }

  _readAtRule () {
    let start = this.input.position()
    this.input.next()
    let value = this._readWhile(isIdent)
    return this._createToken('atrule', value, start)
  }

  _readVariable () {
    let start = this.input.position()
    this.input.next()
    let value = this._readWhile(isIdent)
    return this._createToken('variable', value, start)
  }
}

module.exports = TokenStream
