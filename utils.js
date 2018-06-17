
function isType (tok, type) {
  return tok && tok[0] === type
}

function assertType (tok, type) {
  if (!tok || tok[0] !== type) {
    throw new Error(`Expected a ${type}, got a ${tok[0]} (${tok[3]}:${tok[4]})`)
  }
}

module.exports = {
  isType,
  assertType,
}

