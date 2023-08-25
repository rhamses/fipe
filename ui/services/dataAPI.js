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
  findOne() {}
  searchModelos(text) {
    searchModelos[0]["$search"].text.query = text;
    this.fetchBody["pipeline"] = searchModelos;
    this.collection = "modelos";
    this.action = "aggregate";
    return this.load({ body: searchModelos });
  }
  percentageValue(params) {
    const { variacao_id, from, to } = params;
    percentageQuery[0]["$match"]["variacao_id"]["$oid"] = variacao_id;
    percentageQuery[0]["$match"]["reference"]["$gte"] = {
      $date: {
        $numberLong: String(from),
      },
    };
    percentageQuery[0]["$match"]["reference"]["$lte"] = {
      $date: {
        $numberLong: String(to),
      },
    };
    this.fetchBody["pipeline"] = percentageQuery;
    this.collection = "price_timeseries";
    this.action = "aggregate";
    return this.load({ body: percentageQuery });
  }
  load() {
    return fetch(this.fetchUrl, {
      method: "POST",
      body: JSON.stringify(this.fetchBody),
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })
      .then((res) => res.json())
      .then((res) => res.documents)
      .catch((err) => console.log(err));
  }
}

export default DataAPI;
