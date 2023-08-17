const logger = require("firebase-functions/logger");
const { db, isObjectId } = require("./db");
const getFn = async (req, res, collection, method) => {
  try {
    let query = {};
    let sort = {};
    const limit = 30;
    const pathId = req.params?.id;
    const page = req.query?.page || 1;
    const marca_id = req.query?.marca_id;
    const modelo_id = req.query?.modelo_id;
    const variacao_id = req.query?.variacao_id;
    const rangeDate = req.query?.date;
    const ano = req.query?.ano;
    if (marca_id) {
      query = { marca_id };
    }
    if (modelo_id) {
      query = { modelo_id };
    }
    if (variacao_id) {
      query = { variacao_id };
    }
    if (ano) {
      query["ano"] = Number(ano);
    }
    if (rangeDate) {
      const dates = rangeDate.split(",");
      if (dates.length > 0) {
        const dateFrom = dates[0] ? new Date(dates[0]) : new Date();
        const dateTo = dates[1] ? new Date(dates[1]) : new Date();
        query["reference"] = {
          $gte: dateFrom,
          $lt: dateTo,
        };
        sort = { reference: 1 };
      }
    }
    if (Boolean(pathId)) {
      if (isObjectId(pathId)) {
        query = { _id: pathId };
      } else {
        query = { slug: pathId };
      }
    }
    const result = await db(collection, query, method, {
      limit,
      page,
      marca_id,
      sort,
      opts: {},
    });
    logger.info(result, { structuredData: true });
    return result;
  } catch (error) {
    logger.info(error, { structuredData: true });
    return { message: error.message };
  }
};

module.exports = getFn;
