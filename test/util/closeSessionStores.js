// windows refuses to unlink a file that something still has open, so a sqlite session store has to be closed before the folder holding it can be removed
// linux and macos unlink an open file happily, which is why tests that never closed their stores passed everywhere except windows
module.exports = expressApps => {
  for (const expressApp of [].concat(expressApps)) {
    try {
      expressApp?.get?.('expressSessionStore')?.client?.close()
    } catch {
      // a store that was already closed, or one that never opened a file, needs nothing doing to it
    }
  }
}
