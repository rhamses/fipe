const { MongoClient, ObjectId } = require("mongodb");
const uri =
  "mongodb+srv://ambiente1:HzRYel5sSP1av7SC@cluster0.zeadg.gcp.mongodb.net/?retryWrites=true&w=majority";
const db = "fipe";
/**
 *
 * @param {string} collection
 * @param {string} query
 * @param {string} method
 * @param {object} options
 *
 */
const isObjectId = (id) => {
  return ObjectId.isValid(id);
};
const run = async (
  collection,
  query = {},
  method,
  options = { limit: 30, page: 0, opts: {} }
) => {
  const client = new MongoClient(uri);
  try {
    let result;
    const { opts, limit, sort } = options;
    let { page } = options;
    const database = client.db(db);
    const model = database.collection(collection);
    for (const key of Object.keys(query)) {
      if (key.includes("_id")) {
        query[key] = new ObjectId(query[key]);
      }
    }
    if (method === "find") {
      if (page > 0) {
        page = page - 1;
      }
      const skip = limit * page;
      result = await model[method](query, opts)
        ["limit"](limit)
        ["skip"](skip)
        ["sort"](sort);
      const newResult = {
        total: await model.countDocuments(query),
        page: page + 1,
        data: [],
      };
      for await (const item of result) {
        newResult.data.push(item);
      }
      result = newResult;
    } else if (method === "aggregate") {
      const newResult = {
        total: await model.countDocuments(query),
        page: page + 1,
        data: [],
      };
      result = await model[method](query, options);
      for await (const item of result) {
        newResult.data.push(item);
      }
      result = newResult;
    } else {
      result = await model[method](query, options);
    }
    return result;
  } finally {
    await client.close();
  }
};

exports.db = run;
exports.isObjectId = isObjectId;
