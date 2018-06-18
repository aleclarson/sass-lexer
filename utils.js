
function isType (tok, type) {
  return tok && tok[0] === type
}

function isValue (tok, value) {
  return tok && tok[1] === value
}

function notType (tok, type) {
  return tok && tok[0] !== type
}

function notValue (tok, value) {
  return tok && tok[1] !== value
}

function assertType (tok, type) {
  if (!tok || tok[0] !== type) {
    throw new Error(`Expected a ${type}, got a ${tok[0]} (${tok[3]}:${tok[4]})`)
  }
}

function assertValue (tok, value) {
  if (!tok || tok[1] !== value) {
    throw new Error(`Expected '${value}', got '${tok[1]}' (${tok[3]}:${tok[4]})`)
  }
}

module.exports = {
  isType,
  isValue,
  notType,
  notValue,
  assertType,
  assertValue,
}
