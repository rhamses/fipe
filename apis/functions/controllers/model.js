const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const processRoute = require("../services/route");
const Model = (model) => {
  const app = express();

  app.get("/", async (req, res) => {
    const method = "find";
    const result = await processRoute(req, res, model, method);
    if (result["message"]) {
      res.status(401).send(result);
    }
    res.send(result);
  });

  app.get("/:id", async (req, res) => {
    const method = "findOne";
    const result = await processRoute(req, res, model, method);
    if (result["message"]) {
      res.status(401).send(result);
    }
    res.send(result);
  });

  app.get("/:slug/:action", async (req, res) => {
    let query;
    let method;
    if (req.params.action == "modelos") {
      query = [
        {
          $match: {
            slug: "citroen",
          },
        },
        {
          $lookup: {
            from: "modelos",
            localField: "_id",
            foreignField: "marca_id",
            as: "result",
          },
        },
        {
          $unwind: {
            path: "$result",
          },
        },
        {
          $project: {
            _id: 0,
            name: "$result.name",
            slug: "$result.slug",
          },
        },
      ];
      method = "aggregate";
    }
    const result = await processRoute(req, res, model, method, query);
    console.log("result", result);
  });

  return onRequest({ region: "southamerica-east1" }, app);
};
module.exports = Model;
