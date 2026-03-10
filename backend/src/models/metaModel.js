const { createSingletonModel } = require('./_helpers')

const metaModel = createSingletonModel('meta', '_jmmsMeta', 'root')

module.exports = { metaModel }
