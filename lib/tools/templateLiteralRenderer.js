module.exports = (templateString, dataModel) => {
  const templateFunction = new Function(...Object.keys(dataModel), `return \`${templateString}\`;`) // eslint-disable-line
  return templateFunction(...Object.values(dataModel))
}
