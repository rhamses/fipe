const MesReferencia = require("./models/Referencia.js");
const ListarMarcas = require("./models/Marcas.js");
const Modelos = require("./models/Modelos.js");
const ModelosAnos = require("./models/ModelosAnos.js");
const Valor = require("./models/Valor.js");
const codVeiculos = [{
  id: 1,
  nome: "Automoveis"
},{
  id: 2,
  nome: "Motos"
},{
  id: 3,
  nome: "Caminhoes"
}];

(async () => {
  const config = {
    codigoTipoVeiculo: codVeiculos[0].id,
  };
  const months = await MesReferencia(config);
  config.codigoTabelaReferencia = months[0].Codigo;
  console.log("months", months);
  const brands = await ListarMarcas(config);
  config.codigoMarca = brands[0].Value;
  console.log("brands", brands);
  const models = await Modelos(config)
  config.codigoModelo = models.Modelos[0].Value;
  console.log("models", models);
  const modelsYears = await ModelosAnos(config)
  config.codigoTipoCombustivel = modelsYears[0].Value.split('-')[1];
  config.anoModelo = modelsYears[0].Value.split('-')[0];
  console.log("modelsYears", modelsYears);
  const fipePrice = await Valor(config)
  console.log("fipePrice", fipePrice);
  // Elasticsearch Body
  const body = {
    montadora: brands[0].Label,
    modelo: models.Modelos[0].Label,
    tipo: codVeiculos[0].nome,
    fabricacao: [{
      ano: modelsYears[0].Value.split('-')[0],
      combustivel: modelsYears[0].Value.split('-')[1],
      referencia: [{
        mes: months[0].Mes.split('/')[0],
        ano: months[0].Mes.split('/')[1],
        valor: Number(fipePrice.Valor.match(/\d/gmi).join(""))
      }]
    }]
  };
  console.log("result", JSON.stringify(body));
})()