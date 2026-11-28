// text made safe to put in html, as an element's content or a quoted attribute's value
const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

module.exports = text => String(text ?? '').replace(/[&<>"']/g, character => entities[character])
