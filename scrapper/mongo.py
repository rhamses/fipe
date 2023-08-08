import logging
import json
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
from slugify import slugify
from os import walk

logFile = "output-mongo-" + str(datetime.now()) + ".log"
logging.basicConfig(filename=logFile, encoding="utf-8")
indexesPath = "data/indexes"
MARCA_PATH = "data/indexes/marcas/"
MODELO_PATH = "data/indexes/modelos/"
VARIACAO_PATH = "data/indexes/variacao/"
PRICE_PATH = "data/indexes/price/"
MONGO_CONNECTION_STRING = "mongodb+srv://ambiente1:HzRYel5sSP1av7SC@cluster0.zeadg.gcp.mongodb.net/?retryWrites=true&w=majority"
MONGO_DB = "fipe"


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


def processMongo(path):
    try:
        mongo = connectMongo()
        for dirpath, dirnames, filenames in walk(path):
            for filename in filenames:
                items = json.load(open(dirpath + filename))
                if "Modelos" in items:
                    items = items["Modelos"]
                for item in items:
                    if "marcas" in path:
                        data = getMarcas(item)
                    if "modelo" in path:
                        data = getModelo(item)
                        marcaID = int(filename.split("-")[1])
                        # print(marcaID)
                        # print(filename)
                        # exit()
                        model = mongo["db"]["marcas"]
                        marca = model.find_one({"value": marcaID})
                        if marca is not None:
                            data["result"]["marca_id"] = ObjectId(marca["_id"])
                        # print(data["result"])
                        # exit()
                    model = mongo["db"][data["model"]]
                    mongoFilter = {"name": data["result"]["slug"]}
                    mongoData = {"$set": data["result"]}
                    model.update_one(mongoFilter, mongoData, upsert=True)
        mongo["client"].close()
    except Exception as e:
        logging.error(e)


def connectMongo():
    client = MongoClient(MONGO_CONNECTION_STRING)
    db = client[MONGO_DB]
    return {"client": client, "db": db}


def processMongo1(filenames, dirpath):
    try:
        # Provide the mongodb atlas url to connect python to mongodb using pymongo
        CONNECTION_STRING = "mongodb+srv://ambiente1:HzRYel5sSP1av7SC@cluster0.zeadg.gcp.mongodb.net/?retryWrites=true&w=majority"
        # Create a connection using MongoClient. You can import MongoClient or use pymongo.MongoClient
        client = MongoClient(CONNECTION_STRING)
        ##
        db = client["fipe"]
        return db
        colBrandModel = db["brand_model"]
        colModelVariation = db["model_variation"]
        colPriceTime = db["price_timeseries"]
        months = {
            "janeiro": 1,
            "fevereiro": 2,
            "marco": 3,
            "abril": 4,
            "maio": 5,
            "junho": 6,
            "julho": 7,
            "agosto": 8,
            "setembro": 9,
            "outubro": 10,
            "novembro": 11,
            "dezembro": 12,
        }
        for filename in filenames:
            with open(dirpath + "/" + filename) as theFile:
                ## parse json file
                data = json.load(theFile)
                ## Get Type Vehicle
                if data["TipoVeiculo"] == 1:
                    vehicleName = "car"
                elif data["TipoVeiculo"] == 2:
                    vehicleName = "motorcycle"
                elif data["TipoVeiculo"] == 3:
                    vehicleName = "truck"
                else:
                    vehicleName = ""
                ## Get price by transform data["Valor"] from String to Float
                price = float(
                    data["Valor"].replace("R$ ", "").replace(".", "").replace(",", ".")
                )
                ## Get Reference Year by transforming "MesReferencia" from string to timestamp
                referenceRaw = data["MesReferencia"].replace(" de ", "-").split("-")
                year = int(referenceRaw[1])
                month = int(months[slugify(referenceRaw[0])])
                newDate = datetime(year, month, 1)
                ## Creating Collections Body
                brandModel = {
                    "model": data["Modelo"],
                    "model-slug": slugify(data["Modelo"]),
                    "brand": data["Marca"],
                    "brand-slug": slugify(data["Marca"]),
                    "codigoFipe": data["CodigoFipe"],
                    "vehicle": {"type": data["TipoVeiculo"], "name": vehicleName},
                }
                modelVariation = {
                    "year": data["AnoModelo"],
                    "fuel": slugify(data["Combustivel"]),
                }
                priceTimeSeries = {"price": price, "reference": newDate}
                ## Update Brand Model
                mongoFilter = {"model-slug": brandModel["model-slug"]}
                mongoUpdate = {"$set": brandModel}
                brandId = colBrandModel.update_one(
                    mongoFilter, mongoUpdate, upsert=True
                )
                ## Check Brand insert id
                if brandId.upserted_id == None:
                    brandId = colBrandModel.find_one(
                        {"model-slug": brandModel["model-slug"]}
                    )["_id"]
                else:
                    brandId = brandId.upserted_id
                ## Update Model Variation
                modelVariation["brand_id"] = ObjectId(brandId)
                mongoFilter = {
                    "brand_id": modelVariation["brand_id"],
                    "year": modelVariation["year"],
                }
                mongoUpdate = {"$set": modelVariation}
                variationId = colModelVariation.update_one(
                    mongoFilter, mongoUpdate, upsert=True
                )
                ## Check Brand insert id
                if variationId.upserted_id == None:
                    variationId = colModelVariation.find_one(mongoFilter)["_id"]
                else:
                    variationId = variationId.upserted_id
                print(filename)
                ## Insert time series data
                # priceTimeSeries["metadata"] = ObjectId(variationId)
                # colPriceTime.insert_one(priceTimeSeries)
        client.close()
    except Exception as e:
        logging.warning("(processMongo) - " + json.dumps(data) + " - " + filename)
        logging.error("(processMongo) - " + str(e))


if __name__ == "__main__":
    try:
        # processMongo(MARCA_PATH)
        processMongo(MODELO_PATH)
    except Exception as e:
        logging.error(e)
