const AxiosHelper = require('./request.js');

const Controller = async (params) => {
  const {
    codigoTipoVeiculo,
    codigoTabelaReferencia,
    codigoMarca
  } = params;

  const body = {
    codigoTipoVeiculo: codigoTipoVeiculo.toString(),
    codigoTabelaReferencia: codigoTabelaReferencia.toString(),
    codigoMarca: codigoMarca.toString()
  }
  return AxiosHelper(body, 'ConsultarModelos');
}

module.exports = Controller