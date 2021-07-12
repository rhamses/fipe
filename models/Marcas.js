const AxiosHelper = require('./request.js');

const Controller = async (params) => {
  const {
    codigoTipoVeiculo,
    codigoTabelaReferencia,
  } = params;
  const body = {
    codigoTipoVeiculo: codigoTipoVeiculo.toString(),
    codigoTabelaReferencia: codigoTabelaReferencia.toString(),
  }
  return AxiosHelper(body, 'ConsultarMarcas');
}

module.exports = Controller