const AxiosHelper = require('./request.js');

const Controller = async () => {
  return AxiosHelper(null, 'ConsultarTabelaDeReferencia');
}

module.exports = Controller