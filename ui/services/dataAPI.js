import { searchModelos, percentageQuery } from "./queries.json";
class DataAPI {
  constructor(params) {
    const { url, dataSource, database, token } = params;
    this.url = url;
    this.urlAction = "";
    this.dataSource = dataSource;
    this.database = database;
    this.token = token;
    this.fetchBody = {
      dataSource: this.dataSource,
      database: this.database,
      collection: this.collection,
    };
  }
  set collection(col) {
    this.fetchBody.collection = col;
  }
  get fetchUrl() {
    return this.url + "/" + this.action;
  }
  find(body) {
    this.action = "find";
    this.fetchBody = { ...this.fetchBody, ...body };
    return this.load();
  }
  insertOne(data) {
    this.fetchBody["document"] = data;
    this.collection = "leads";
    this.action = "insertOne";
    return this.load({ body: percentageQuery });
  }
  findOne() {}
  searchModelos(text) {
    searchModelos[0]["$search"].text.query = text;
    this.fetchBody["pipeline"] = searchModelos;
    this.collection = "marcas_modelos";
    this.action = "aggregate";
    return this.load({ body: searchModelos });
  }
  percentageValue(variacao_id, type) {
    const newPipeline = [...percentageQuery];
    if (type === "monthly") {
      newPipeline.splice(1, 0, { $limit: 2 });
    }
    if (type === "yearly") {
      newPipeline[0]["$match"]["reference"] = {
        $gte: {
          $date: {
            $numberLong: String(
              new Date(new Date().getUTCFullYear(), 0, 1).getTime()
            ),
          },
        },
      };
    }
    newPipeline[0]["$match"]["variacao_id"]["$oid"] = variacao_id;
    this.fetchBody["pipeline"] = newPipeline;
    this.collection = "price_timeseries";
    this.action = "aggregate";
    return this.load({ body: newPipeline });
  }
  load() {
    return fetch(this.fetchUrl, {
      method: "POST",
      body: JSON.stringify(this.fetchBody),
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json ",
      },
    })
      .then((res) => res.json())
      .then((res) => res.documents)
      .catch((err) => console.log(err));
  }
}

export default DataAPI;
