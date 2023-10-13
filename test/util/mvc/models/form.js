const model = {
  content: {
    appTitle: 'sampleAppCSRF',
    pageTitle: '{content.appTitle}', // override this on a per route level
    titleTag: '{content.appTitle} — {content.pageTitle}'
  }
}

module.exports = (req, res) => {
  return {
    content: model.content
  }
}
