const MesReferencia = require("./controllers/Referencia.js");
const ListarMarcas = require("./controllers/Marcas.js");
const codVeiculos = [1,2,3];

(async () => {
  MesReferencia().then(months => {
    console.log(months[0]);
  });
  ListarMarcas(272, 1).then(brands => {
    console.log(brands[0]);
  })
})()