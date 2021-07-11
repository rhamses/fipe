const AxiosHelper = require('./axios.js');

const Controller = async () => {
  return Promise.resolve(AxiosHelper(null, '/ConsultarTabelaDeReferencia'));
}

module.exports = Controller