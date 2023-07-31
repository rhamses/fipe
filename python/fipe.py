import os
import logging
import requests
import logging
import json
import threading
import math
from datetime import datetime
from os import walk
from slugify import slugify
from pymongo import MongoClient
from bson import ObjectId

logFile = "output-index-" + str(datetime.now()) + ".log"
logging.basicConfig(filename=logFile, encoding="utf-8")
indexesPath = "data/indexes"
MARCA_PATH = "data/indexes/marcas/"
MODELO_PATH = "data/indexes/modelos/"
VARIACAO_PATH = "data/indexes/variacao/"
PRICE_PATH = "data/indexes/price/"
"""
Considerar um array principal [1,2,3], onde cada número é o código do veículos
  1 - carros
  2 - motos
  3 - caminhões

Este script salva dentro de uma pasta "INDEX" o conteúdo total da api a seguir:
- "indexes" > "meses" > "meses-{codigoVeiculo}.py"
  todos os meses de referencia da tabela FIPE.
  Isso vale para todos os tipos de veículos
- "indexes" > "marcas" > "{codigoTabelaReferencia}-{codigoVeiculo}.json"
  todas as marcas ordenadas por mês da tabela e código do veículo.
  Objetivo é mapear todas as marcas ao longo do período pesquisado.
- "indexes" > "modelos" > "{codigoTabelaReferencia}-{codigoMarca}-{codigoVeiculo}.json"
  todos os modelos e seus anos são adicionados aqui. Aqui vai juntar com o
  endpoint /ConsultarAnoModelo para adicionar o ano certo de cada modelo

Os scripts todos estarão escritos aqui mas não necessariamente precisa rodar
todos ao mesmo tempo
"""


########################################
#
#
#
# GLOBAL FUNCTIONS
#
#
#
########################################
def checkFolder(folder):
    folders = folder.split("/")
    currentFolder = ""
    for fl in folders:
        currentFolder += fl
        if os.path.isdir(currentFolder) == False:
            os.mkdir(currentFolder)
        currentFolder += "/"


def requestData(path, data=None):
    try:
        result = requests.post(path, data=data)
        body = result.json()
        if result.status_code == 200 and "erro" not in body:
            return body
        else:
            raise Exception
    except Exception as e:
        logging.warning(path)
        logging.warning(data)
        logging.warning(result)
        logging.error("(requestData) - " + str(e))
        return False


def saveData(folder, file, data, mode="w"):
    try:
        checkFolder(folder)
        f = open(folder + "/" + file, mode)
        f.write(json.dumps(data))
        f.close()
        return True
    except Exception as e:
        logging.error("(saveData) - " + str(e))


def uploadToGoogle(folder, data, fileName="index.json"):
    client = storage.Client(project="amb1-fipe")
    bucket = client.get_bucket("fipe-storage")
    blob = bucket.blob(folder + "/" + fileName)
    result = blob.upload_from_string(
        json.dumps(data), content_type="application/json;charset=UTF-8"
    )
    try:
        if ".json" in fileName:
            contentType = "application/json;charset=UTF-8"
        elif ".txt" in fileName:
            contentType = "text/plain"
        client = storage.Client(project="amb1-fipe")
        bucket = client.get_bucket("fipe-storage")
        blob = bucket.blob(folder)
        result = blob.upload_from_string(json.dumps(data), content_type=contentType)
    except:
        return False


########################################
#
#
#
# PROCESSES FUNCTIONS
#
#
#
########################################
def processMeses():
    try:
        # write anos onto folder
        folder = "indexes"
        fileName = "meses.json"
        result = requestData(
            path="https://veiculos.fipe.org.br/api/veiculos/ConsultarTabelaDeReferencia"
        )
        saveData(folder=folder, file=fileName, data=result)
    except Exception as e:
        logging.error("(processMeses) - " + str(e))


def processMarcas(vehicleIndex):
    try:
        # Le pasta anos
        with open("indexes/meses.json") as meses:
            meses = json.load(meses)
            for mes in meses:
                codigoTabelaReferencia = mes["Codigo"]
                path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas"
                data = {
                    "codigoTabelaReferencia": codigoTabelaReferencia,
                    "codigoTipoVeiculo": vehicleIndex,
                }
                result = requestData(path=path, data=data)
                # write marcas onto folder
                folder = "indexes/marcas"
                fileName = f"{codigoTabelaReferencia}-{vehicleIndex}.json"
                saveData(folder=folder, file=fileName, data=result)
    except Exception as e:
        logging.error("(processMarcas) - " + str(e))


def processThread(filenames, dirpath, FOLDERPATH):
    try:
        for filename in filenames:
            with open(dirpath + "/" + filename) as itemFile:
                items = json.load(itemFile)
                filename = filename.replace(".json", "").replace(dirpath + "/", "")
                ## Check para payload de Modelos
                ## Que afeta quando FOLDERPATH = "variacao"
                if "Modelos" in items:
                    items = items["Modelos"]
                for item in items:
                    if "price" in FOLDERPATH:
                        path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTodosParametros"
                        codigoTabelaReferencia = filename.split("-")[0]
                        codigoMarca = filename.split("-")[1]
                        codigoModelo = filename.split("-")[2]
                        codigoTipoVeiculo = filename.split("-")[3]
                        codigoTipoCombustivel = item["Value"].split("-")[1]
                        anoModelo = item["Value"].split("-")[0]
                        ## generate filename
                        fileName = f"{codigoTabelaReferencia}-{codigoMarca}-{codigoModelo}-{codigoTipoCombustivel}-{anoModelo}-{codigoTipoVeiculo}.json"
                        data = {
                            "codigoMarca": codigoMarca,
                            "codigoModelo": codigoModelo,
                            "codigoTabelaReferencia": codigoTabelaReferencia,
                            "codigoTipoCombustivel": codigoTipoCombustivel,
                            "codigoTipoVeiculo": codigoTipoVeiculo,
                            "anoModelo": anoModelo,
                            "tipoConsulta": "tradicional",
                        }
                    elif "variacao" in FOLDERPATH:
                        path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarAnoModelo"
                        codigoTabelaReferencia = filename.split("-")[0]
                        codigoMarca = filename.split("-")[1]
                        codigoTipoVeiculo = filename.split("-")[2]
                        codigoModelo = str(item["Value"])
                        ## Estou assumindo que se tiver a marca não precisa investigar se o
                        ## modelo existe.
                        fileName = (
                            codigoTabelaReferencia
                            + "-"
                            + codigoMarca
                            + "-"
                            + codigoModelo
                            + "-"
                            + codigoTipoVeiculo
                            + ".json"
                        )
                        data = {
                            "codigoMarca": codigoMarca,
                            "codigoModelo": codigoModelo,
                            "codigoTabelaReferencia": codigoTabelaReferencia,
                            "codigoTipoVeiculo": codigoTipoVeiculo,
                        }
                    elif "modelos" in FOLDERPATH:
                        path = (
                            "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos"
                        )
                        codigoTabelaReferencia = filename.split("-")[0]
                        codigoTipoVeiculo = filename.split("-")[1]
                        codigoMarca = item["Value"]
                        data = {
                            "codigoTabelaReferencia": codigoTabelaReferencia,
                            "codigoTipoVeiculo": codigoTipoVeiculo,
                            "codigoMarca": codigoMarca,
                        }
                    elif "marcas" in FOLDERPATH:
                        path = (
                            "https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas"
                        )
                        codigoTabelaReferencia = filename.split("-")[0]
                        codigoTipoVeiculo = filename.split("-")[1]
                        data = {
                            "codigoTabelaReferencia": codigoTabelaReferencia,
                            "codigoTipoVeiculo": codigoTipoVeiculo,
                        }
                    if os.path.exists(FOLDERPATH + filename) == False:
                        result = requestData(path=path, data=data)
                        saveData(folder=PRICE_PATH, file=filename, data=result)
    except Exception as e:
        logging.error("--------------------")
        logging.error("FOLDERPATH - " + FOLDERPATH)
        logging.error("dirpath - " + dirpath)
        logging.error("filename - " + filename)
        logging.error("(processThread) - " + str(e))


########################################
#
#
#
# START THREADS FUNCTIONS
#
#
#
########################################


def startMongo():
    for dirpath, dirnames, filenames in walk(indexesPath + "/price"):
        numberOfInstances = 50
        instances = math.ceil(len(filenames) / numberOfInstances)
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
            threads.append(threading.Thread(target=processMongo, args=(item, dirpath)))
        for t in threads:
            t.start()
        for t in threads:
            t.join()


def startThread(path, instance, target, FOLDERPATH):
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
            threads.append(
                threading.Thread(target=target, args=(item, dirpath, FOLDERPATH))
            )
        for t in threads:
            t.start()
        for t in threads:
            t.join()


########################################

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


def deleteMongo(collection):
    # Provide the mongodb atlas url to connect python to mongodb using pymongo
    CONNECTION_STRING = "mongodb+srv://ambiente1:HzRYel5sSP1av7SC@cluster0.zeadg.gcp.mongodb.net/?retryWrites=true&w=majority"
    # Create a connection using MongoClient. You can import MongoClient or use pymongo.MongoClient
    client = MongoClient(CONNECTION_STRING)
    ##
    db = client["fipe"]
    db[collection].delete_many({})


def processMongo(filenames, dirpath):
    try:
        # Provide the mongodb atlas url to connect python to mongodb using pymongo
        CONNECTION_STRING = "mongodb+srv://ambiente1:HzRYel5sSP1av7SC@cluster0.zeadg.gcp.mongodb.net/?retryWrites=true&w=majority"
        # Create a connection using MongoClient. You can import MongoClient or use pymongo.MongoClient
        client = MongoClient(CONNECTION_STRING)
        ##
        db = client["fipe"]
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
        # startMongo()
        # deleteMongo("price_timeseries")
        """
        => PROCESSA MODELOS
        <= GERA VARIACOES DE CADA MODELO"""
        startThread(
            ## LÊ MODELOS -> GERA VARIACOES
            # path=MODELO_PATH,
            # FOLDERPATH=VARIACAO_PATH,
            ## LÊ VARIACAO -> GERA PRECO
            # path=VARIACAO_PATH,
            # FOLDERPATH=PRICE_PATH,
            ## LÊ MARCAS -> GERA MODELOS
            # path=MARCA_PATH,
            # FOLDERPATH=MODELO_PATH,
            # instance=1,
            # target=processThread,
        )
    except Exception as e:
        logging.error(e)
