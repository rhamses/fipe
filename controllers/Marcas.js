const AxiosHelper = require('./axios.js');

const Controller = async (month, vehicle) => {
  const body = {
    codigoTipoVeiculo: "1",
    codigoTabelaReferencia: "272",
  }
  return Promise.resolve(AxiosHelper(body, '/ConsultarMarcas'));
}

module.exports = Controller