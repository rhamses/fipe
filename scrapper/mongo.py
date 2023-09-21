import logging
import json
import threading
import math
from datetime import datetime
from pymongo import MongoClient, UpdateOne, InsertOne
from bson import ObjectId
from slugify import slugify
from os import walk, path, rename


"""
Collection brand_model
_id,
model,
model-slug,
brand,
brand-slug,
codigoFipe,
vehicle: {
  type: Int,
  name: String
}

Collection price_timeseries
_id,
model_variation_id ObjectId
price Float
reference Timestamp (mes de referencia)

Collection model_variation
_id,
brand_model_id,
year,
fuel,
"""

logFile = "output-mongo-" + str(datetime.now()) + ".log"
logging.basicConfig(filename=logFile, encoding="utf-8")
indexesPath = "data/indexes"
MARCA_PATH = "data/indexes/marcas/"
MODELO_PATH = "data/indexes/modelos/"
VARIACAO_PATH = "data/indexes/variacao/"
PRICE_PATH = "data/indexes/price/"
PROCESSED_FILE = "data/indexes/price-processed/"
MONGO_CONNECTION_STRING = "mongodb+srv://ambiente1:HzRYel5sSP1av7SC@cluster0.zeadg.gcp.mongodb.net/?retryWrites=true&w=majority"
MONGO_DB = "fipe"
FILTER_MONTH = [300, 301]


def moveFile(filename):
    f = open(PROCESSED_FILE + filename, "w")
    f.write("")
    f.close()


def getMarcas(item):
    data = {
        "name": item["Label"],
        "slug": slugify(item["Label"]),
        "value": int(item["Value"]),
    }
    return {"model": "marcas", "result": data}


def getModelo(item):
    data = {
        "name": item["Label"],
        "slug": slugify(item["Label"]),
        "value": int(item["Value"]),
    }
    return {"model": "modelos", "result": data}


def getVariacao(item):
    try:
        year = int(item["Value"].split("-")[0])
        fuel = int(item["Value"].split("-")[1])
        if fuel == 1:
            fuel = "gasolina"
        if fuel == 2:
            fuel = "alcool"
        if fuel == 3:
            fuel = "diesel"
        data = {"ano": year, "combustivel": fuel}
        return {"model": "variacoes", "result": data}
    except Exception as e:
        logging.error(e)


def getPreco(item):
    print("asda")


def deleteMongo(collection):
    try:
        mongo = connectMongo()
        model = mongo["db"][collection]
        model[collection].delete_many({})
        mongo["client"].close()
    except Exception as e:
        logging.error(e)


def processMongo(filenames, dirpath):
    try:
        for filename in filenames:
            mongo = connectMongo()
            model = ""
            queries = []
            items = json.load(open(dirpath + filename))
            if "Modelos" in items:
                items = items["Modelos"]
            for item in items:
                if "marcas" in dirpath:
                    data = getMarcas(item)
                if "modelo" in dirpath:
                    data = getModelo(item)
                    marcaID = int(filename.split("-")[1])
                    model = mongo["db"]["marcas"]
                    marca = model.find_one({"value": marcaID})
                    if marca is not None:
                        data["result"]["marca_id"] = ObjectId(marca["_id"])
                if "variacao" in dirpath:
                    data = getVariacao(item)
                    modelModelos = mongo["db"]["modelos"]
                    model = mongo["db"][data["model"]]
                    filepieces = filename.replace(".json", "").split("-")
                    modelo = modelModelos.find_one({"value": int(filepieces[2])})
                    if modelo is not None:
                        data["result"]["marca_id"] = ObjectId(modelo["marca_id"])
                        data["result"]["modelo_id"] = ObjectId(modelo["_id"])
                model = mongo["db"][data["model"]]
                mongoFilter = data["result"]
                mongoData = {"$set": data["result"]}
                if model.find_one(data["result"]) is None:
                    model.insert_one(data["result"])
                # queries.append(UpdateOne(mongoFilter, mongoData, upsert=True))
            # result = model.bulk_write(queries)
            mongo["client"].close()
    except Exception as e:
        logging.error(e)


def processFilterPrice(filenames, dirpath):
    results = []
    for filename in filenames:
        if path.isfile(PROCESSED_FILE + filename) is False:
            if json.load(open(dirpath + filename)):
                if int(filename.split("-")[0]) in FILTER_MONTH:
                    results.append(filename)
    processPrice(results, dirpath)


def processPrice(filenames, dirpath):
    try:
        # print("filenames", filenames)
        for filename in filenames:
            msgErr = "Arquivo False"
            fileContent = json.load(open(dirpath + filename))
            if fileContent:
                filePieces = filename.replace(".json", "").split("-")
                mongo = connectMongo()
                model = mongo["db"]["price_timeseries"]
                ## Pega Variacao ID
                modelModelos = mongo["db"]["modelos"]
                pipeline = [
                    {"$match": {"value": int(filePieces[2])}},
                    {
                        "$lookup": {
                            "from": "variacoes",
                            "localField": "_id",
                            "foreignField": "modelo_id",
                            "as": "result",
                        }
                    },
                    {"$unwind": {"path": "$result"}},
                    {"$match": {"result.ano": int(filePieces[4])}},
                    {
                        "$project": {
                            "_id": 0,
                            "marca_id": 1,
                            "modelo_id": "$result.modelo_id",
                            "variacao_id": "$result._id",
                        }
                    },
                ]
                msgErr = "modelModelos aggregate false"
                result = list(modelModelos.aggregate(pipeline))
                if len(result) >= 1:
                    result = result[0]
                    price = float(
                        fileContent["Valor"]
                        .replace("R$ ", "")
                        .replace(".", "")
                        .replace(",", ".")
                    )
                    timestamp = filterDate(fileContent["MesReferencia"])
                    data = {
                        "variacao_id": result["variacao_id"],
                        "reference": timestamp,
                        "price": price,
                        "autenticacao": fileContent["Autenticacao"],
                    }
                    ## Check if entry already exists
                    ## If is not, include it
                    if model.find_one(data) is None:
                        model.insert_one(data)
                        moveFile(filename)
                mongo["client"].close()
            else:
                logging.warning(msgErr)
                logging.warning(filename)
    except Exception as e:
        logging.error("processPrice")
        logging.error(filename)
        logging.error(e)


def connectMongo():
    client = MongoClient(MONGO_CONNECTION_STRING)
    db = client[MONGO_DB]
    return {"client": client, "db": db}


def deleteDuplicates(model):
    try:
        db = connectMongo()
        model = db["db"][model]
        pipeline = [
            {
                "$group": {
                    "_id": "$value",
                    "dups": {"$push": "$_id"},
                    "count": {"$sum": 1},
                }
            }
        ]
        items = list(model.aggregate(pipeline=pipeline))
        for item in items:
            item["dups"].pop(0)
            model.delete_many({"_id": {"$in": item["dups"]}})
    except Exception as e:
        logging.error(e)


def filterDate(date):
    date = slugify(date.strip())
    mes = 0
    ano = int(date[len(date) - 4 : len(date)])

    if "janeiro" in date:
        mes = 1
    elif "fevereiro" in date:
        mes = 2
    elif "marco" in date:
        mes = 3
    elif "abril" in date:
        mes = 4
    elif "maio" in date:
        mes = 5
    elif "junho" in date:
        mes = 6
    elif "julho" in date:
        mes = 7
    elif "agosto" in date:
        mes = 8
    elif "setembro" in date:
        mes = 9
    elif "outubro" in date:
        mes = 10
    elif "novembro" in date:
        mes = 11
    elif "dezembro" in date:
        mes = 12

    return datetime(ano, mes, 1)


def startThread(path, instance, target):
    for dirpath, dirnames, filenames in walk(path):
        logging.warning("Total of " + path + " - " + str(len(filenames)))
        instances = math.ceil(len(filenames) / instance)
        threads = []
        pieces = []
        current = 0
        while True:
            data = filenames[current : (current + instances)]
            if len(data) == 0:
                break
            pieces.append(data)
            current = current + instances
        for item in pieces:
            threads.append(threading.Thread(target=target, args=(item, dirpath)))
        for t in threads:
            t.start()
        for t in threads:
            t.join()


def createSearchView():
    query = [
        {
            "$lookup": {
                "from": "modelos",
                "localField": "_id",
                "foreignField": "marca_id",
                "as": "modelos",
            }
        },
        {
            "$lookup": {
                "from": "variacoes",
                "localField": "_id",
                "foreignField": "marca_id",
                "as": "variacoes",
            }
        },
        {"$unwind": {"path": "$modelos", "preserveNullAndEmptyArrays": False}},
        {"$unwind": {"path": "$variacoes", "preserveNullAndEmptyArrays": False}},
        {
            "$project": {
                "marca_id": "$_id",
                "modelo_id": "$modelos._id",
                "variacao_id": "$variacoes._id",
                "marca_name": "$name",
                "marca_slug": "$slug",
                "modelo_name": "$modelos.name",
                "modelo_slug": "$modelos.slug",
                "variacao_ano": "$variacoes.ano",
            }
        },
        {
            "$merge": {
                "into": "listindex",
                "whenMatched": "replace",
                "whenNotMatched": "insert",
            }
        },
    ]
    mongo = connectMongo()
    model = mongo["db"]["marcas"]
    result = model.aggregate(query)
    print(result)


def filterFiles():
    for dirpath, dirnames, filenames in walk(PRICE_PATH):
        for filename in filenames:
            fileExists = json.load(open(dirpath + filename))
            if len(filename.split("-")) != 6:
                rename(dirpath + filename, "data/indexes/not-6-price/" + filename)
            elif fileExists is False:
                rename(dirpath + filename, "data/indexes/is-false-price/" + filename)


if __name__ == "__main__":
    try:
        # deleteDuplicates("modelos")
        # startThread(path=MARCA_PATH, instance=12, target=processMongo)
        # startThread(path=MODELO_PATH, instance=12, target=processMongo)
        # startThread(path=VARIACAO_PATH, instance=1, target=processMongo)
        # deleteMongo("price_timeseries")
        # startThread(path=PRICE_PATH, instance=50, target=processPrice)
        startThread(path=PRICE_PATH, instance=20, target=processFilterPrice)
        # createSearchView()
        # filterFiles()
    except Exception as e:
        logging.error("main error")
        logging.error(e)
