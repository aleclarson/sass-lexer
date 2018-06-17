# sass-lexer

Taken from [scss-parser](https://npmjs.org/package/scss-parser).

```js
const tokenize = require('sass-lexer');

// takes a string
const tokens = tokenize(input);

// get the next token
tokens.next();

// look ahead
tokens.peek(offset);

// check for end of file
tokens.eof();

// throw an error with line & column
tokens.err('oh crap');
```
