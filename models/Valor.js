const AxiosHelper = require('./request.js');

const Controller = async (params) => {
  const {
    codigoTipoVeiculo,
    codigoTabelaReferencia,
    codigoMarca,
    codigoModelo,
    codigoTipoCombustivel,
    anoModelo,
    tipoConsulta,
  } = params;
  const body = {
    codigoTipoVeiculo: codigoTipoVeiculo.toString(),
    codigoTabelaReferencia: codigoTabelaReferencia.toString(),
    codigoMarca: codigoMarca.toString(),
    codigoModelo: codigoModelo.toString(),
    codigoTipoCombustivel: codigoTipoCombustivel.toString(),
    anoModelo: anoModelo.toString(),
    tipoConsulta: "tradicional"
  }
  return AxiosHelper(body, 'ConsultarValorComTodosParametros');
}

module.exports = Controller