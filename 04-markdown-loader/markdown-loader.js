const marked = require('marked')

module.exports = source => {
  const html = marked(source)
  // const code = `module.exports=${JSON.stringify(html)}`
  // const code = `export default ${JSON.stringify(html)}`
  return html
}