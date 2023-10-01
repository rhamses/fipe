import os
import logging
import requests
import json
import threading
import math
import sys
from datetime import datetime
from os import walk
from slugify import slugify
from pymongo import MongoClient
from bson import ObjectId

logFile = "output-index-" + str(datetime.now()) + ".log"
logging.basicConfig(filename=logFile, encoding="utf-8")
indexesPath = "data/indexes/"
MARCA_PATH = "data/indexes/marcas/"
MODELO_PATH = "data/indexes/modelos/"
VARIACAO_PATH = "data/indexes/variacao/"
PRICE_PATH = "data/indexes/price/"
ERROR_PATH = "data/preco-erro.json"
MONTH_REFERENCE = [293, 294, 295, 296, 297, 298, 299, 300, 301]
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


def requestData(path, context, newFilename, data=None):
    try:
        result = requests.post(path, data=data)
        body = result.json()
        if result.status_code == 200 and "erro" not in body:
            return body
        else:
            raise Exception
    except Exception as e:
        f = open(indexesPath + context + "-error/" + newFilename, "w")
        f.write("")
        f.close()
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
        fileName = "meses.json"
        result = requestData(
            path="https://veiculos.fipe.org.br/api/veiculos/ConsultarTabelaDeReferencia"
        )
        saveData(folder=indexesPath, file=fileName, data=result)
    except Exception as e:
        logging.error("(processMeses) - " + str(e))


def processMarcas():
    try:
        vehicles = [1, 2, 3]
        for vehicleIndex in vehicles:
            with open(indexesPath + "meses.json") as meses:
                meses = json.load(meses)
                for mes in meses:
                    codigoTabelaReferencia = mes["Codigo"]
                    filename = f"{codigoTabelaReferencia}-{vehicleIndex}.json"
                    if os.path.exists(MARCA_PATH + filename) is False:
                        path = (
                            "https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas"
                        )
                        data = {
                            "codigoTabelaReferencia": codigoTabelaReferencia,
                            "codigoTipoVeiculo": vehicleIndex,
                        }
                        result = requestData(path=path, data=data)
                        saveData(folder=MARCA_PATH, file=filename, data=result)
    except Exception as e:
        logging.error("(processMarcas) - " + str(e))


def mapFilename(filename):
    if int(filename.split("-")[0]) in MONTH_REFERENCE:
        return filename


def processThread(filenames, dirpath, FOLDERPATH, error):
    try:
        if len(MONTH_REFERENCE) > 0:
            filenames = list(filter(mapFilename, filenames))
        if len(filenames) > 0:
            for filename in filenames:
                with open(dirpath + filename) as itemFile:
                    items = json.load(itemFile)
                    filename = filename.replace(".json", "").replace(dirpath + "/", "")
                    ## Check para payload de Modelos
                    ## Que afeta quando FOLDERPATH = "variacao"
                    if "Modelos" in items:
                        items = items["Modelos"]
                    for item in items:
                        if "price" in FOLDERPATH:
                            context = "price"
                            path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTodosParametros"
                            codigoTabelaReferencia = filename.split("-")[0]
                            codigoMarca = filename.split("-")[1]
                            codigoModelo = filename.split("-")[2]
                            codigoTipoVeiculo = filename.split("-")[3]
                            codigoTipoCombustivel = item["Value"].split("-")[1]
                            anoModelo = item["Value"].split("-")[0]
                            ## generate filename
                            newFilename = f"{codigoTabelaReferencia}-{codigoMarca}-{codigoModelo}-{codigoTipoCombustivel}-{anoModelo}-{codigoTipoVeiculo}.json"
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
                            context = "variacao"
                            path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarAnoModelo"
                            codigoTabelaReferencia = filename.split("-")[0]
                            codigoMarca = filename.split("-")[1]
                            codigoTipoVeiculo = filename.split("-")[2]
                            codigoModelo = str(item["Value"])
                            ## Estou assumindo que se tiver a marca não precisa investigar se o
                            ## modelo existe.
                            newFilename = f"{codigoTabelaReferencia}-{codigoMarca}-{codigoModelo}-{codigoTipoVeiculo}.json"
                            data = {
                                "codigoMarca": codigoMarca,
                                "codigoModelo": codigoModelo,
                                "codigoTabelaReferencia": codigoTabelaReferencia,
                                "codigoTipoVeiculo": codigoTipoVeiculo,
                            }
                        elif "modelos" in FOLDERPATH:
                            context = "modelos"
                            path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos"
                            codigoTabelaReferencia = filename.split("-")[0]
                            codigoTipoVeiculo = filename.split("-")[1]
                            codigoMarca = item["Value"]
                            newFilename = f"{codigoTabelaReferencia}-{codigoMarca}-{codigoTipoVeiculo}.json"
                            data = {
                                "codigoTabelaReferencia": codigoTabelaReferencia,
                                "codigoTipoVeiculo": codigoTipoVeiculo,
                                "codigoMarca": codigoMarca,
                            }
                        else:
                            break
                        # logging.warning("->" + FOLDERPATH + newFilename)
                        # print("aaa", indexesPath + context + "-error/" + newFilename)
                        if (
                            os.path.exists(FOLDERPATH + newFilename) == False
                            and os.path.exists(
                                indexesPath + context + "-error/" + newFilename
                            )
                            == False
                        ):
                            result = requestData(
                                path=path,
                                data=data,
                                context=context,
                                newFilename=newFilename,
                            )
                            if result:
                                saveData(
                                    folder=FOLDERPATH, file=newFilename, data=result
                                )
                            else:
                                raise Exception("o arquivo deu false" + newFilename)

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
                threading.Thread(
                    target=target,
                    args=(item, dirpath, FOLDERPATH, False),
                )
            )
        for t in threads:
            t.start()
        for t in threads:
            t.join()


########################################


if __name__ == "__main__":
    try:
        # if "--error" in sys.argv:
        #     filenames = json.load(open(ERROR_PATH))
        #     for filename in filenames:
        #         ## BLOCO DE PRICE
        #         path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTodosParametros"
        #         codigoTabelaReferencia = filename.split("-")[0]
        #         codigoMarca = filename.split("-")[1]
        #         codigoModelo = filename.split("-")[2]
        #         codigoTipoCombustivel = filename.split("-")[3]
        #         anoModelo = filename.split("-")[4]
        #         codigoTipoVeiculo = filename.split("-")[5].replace(".json", "")
        #         data = {
        #             "codigoMarca": codigoMarca,
        #             "codigoModelo": codigoModelo,
        #             "codigoTabelaReferencia": codigoTabelaReferencia,
        #             "codigoTipoCombustivel": codigoTipoCombustivel,
        #             "codigoTipoVeiculo": codigoTipoVeiculo,
        #             "anoModelo": anoModelo,
        #             "tipoConsulta": "tradicional",
        #         }
        #         """
        #         ## BLOCO DE MODELO
        #         path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarAnoModelo"
        #         codigoTabelaReferencia = filename.split("-")[0]
        #         codigoMarca = filename.split("-")[1]
        #         codigoModelo = filename.split("-")[2]
        #         codigoTipoVeiculo = filename.split("-")[3].replace(".json", "")
        #         data = {
        #             "codigoMarca": codigoMarca,
        #             "codigoModelo": codigoModelo,
        #             "codigoTabelaReferencia": codigoTabelaReferencia,
        #             "codigoTipoVeiculo": codigoTipoVeiculo,
        #         }
        #         """
        #         result = requestData(path=path, data=data)
        #         saveData(folder=PRICE_PATH, file=filename, data=result)
        # else:
        ## LÊ LISTA DE MESES
        processMeses()
        ## LÊ LISTA DE MESES -> GERA MARCAS
        # processMarcas()
        ## LÊ MARCAS -> GERA MODELOS
        # startThread(
        #     path=MARCA_PATH,
        #     FOLDERPATH=MODELO_PATH,
        #     instance=100,
        #     target=processThread,
        # )
        ## LÊ MODELOS -> GERA VARIACOES
        # startThread(
        #     path=MODELO_PATH,
        #     FOLDERPATH=VARIACAO_PATH,
        #     instance=100,
        #     target=processThread,
        # )
        ## LÊ VARIACAO -> GERA PRECO
        # startThread(
        #     path=VARIACAO_PATH,
        #     FOLDERPATH=PRICE_PATH,
        #     instance=300,
        #     target=processThread,
        # )
        # Le Erros de Price
        # startThread(
        #     path=ERROR_PATH,
        #     FOLDERPATH=PRICE_PATH,
        #     instance=1,
        #     target=processErro,
        # )
    except Exception as e:
        logging.error(e)
