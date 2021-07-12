const AxiosHelper = require('./request.js');

const Controller = async (params) => {
  const {
    codigoTipoVeiculo,
    codigoTabelaReferencia,
    codigoMarca,
    codigoModelo,
  } = params;

  const body = {
    codigoTipoVeiculo: codigoTipoVeiculo.toString(),
    codigoTabelaReferencia: codigoTabelaReferencia.toString(),
    codigoMarca: codigoMarca.toString(),
    codigoModelo: codigoModelo.toString()
  }
  return AxiosHelper(body, 'ConsultarAnoModelo');
}

module.exports = Controller