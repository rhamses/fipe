const model = require("./controllers/model.js");
exports.marcas = model("marcas");
exports.modelos = model("modelos");
exports.variacoes = model("variacoes");
exports.price = model("price_timeseries");
