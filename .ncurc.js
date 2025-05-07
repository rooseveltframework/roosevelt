// customizes the behavior of `ncu -u` to exclude express due to two versions being included https://github.com/raineorshine/npm-check-updates
module.exports = {
  target: (name, semver) => {
    const isAlias = name === 'express' && parseInt(semver[0].major) === 4
    return isAlias ? 'patch' : 'latest'
  }
}
