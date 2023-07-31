import os
import logging
import requests
import logging
import json
import threading
import math
from datetime import datetime
from os import walk

indexesPath = "data/indexes"
VARIACAO_PATH = "data/indexes/variacao/"
MODELO_PATH = "data/indexes/modelos/"
BRANDS_PATH = "data/indexes/marcas/"
PRICE_PATH = "data/indexes/price/"
MONTHS_PATH = "data/indexes/meses.json"


def processFiles(path):
    conjMarca = set()
    conjModelo = set()
    conjMes = set()
    conjVehicle = set()
    conjTotalFiles = 0
    if "mes" in path:
        meses = json.load(open(path))
        for mes in meses:
            conjMes.add(mes["Codigo"])
    else:
        for dirpath, dirnames, filenames in walk(path):
            conjTotalFiles = len(filenames)
            for filename in filenames:
                if "marcas" in path:
                    marcaFiles = json.load(open(dirpath + "/" + filename))
                    codigoTabelaReferencia = filename.split("-")[0]
                    codigoTipoVeiculo = filename.split("-")[1]
                    for item in marcaFiles:
                        conjMarca.add(item["Value"])
                    #
                    conjMes.add(codigoTabelaReferencia)
                    conjVehicle.add(codigoTipoVeiculo)
                if "modelos" in path:
                    codigoTabelaReferencia = filename.split("-")[0]
                    codigoMarca = filename.split("-")[1]
                    codigoTipoVeiculo = filename.split("-")[2]
                    # #
                    conjMes.add(codigoTabelaReferencia)
                    conjMarca.add(codigoMarca)
                    conjVehicle.add(codigoTipoVeiculo)
                if "variacao" in path:
                    codigoTabelaReferencia = filename.split("-")[0]
                    codigoMarca = filename.split("-")[1]
                    codigoModelo = filename.split("-")[2]
                    codigoTipoVeiculo = filename.split("-")[3]
                    #
                    conjMes.add(str(codigoTabelaReferencia))
                    conjMarca.add(str(codigoMarca))
                    conjModelo.add(str(codigoModelo))
                    conjVehicle.add(codigoTipoVeiculo)
                if "price" in path:
                    codigoTabelaReferencia = filename.split("-")[0]
                    codigoMarca = filename.split("-")[1]
                    codigoModelo = filename.split("-")[2]
                    codigoTipoCombustivel = filename.split("-")[3]
                    anoModelo = filename.split("-")[4]
                    codigoTipoVeiculo = filename.split("-")[5]
                    #
                    conjMes.add(str(codigoTabelaReferencia))
                    conjMarca.add(str(codigoMarca))
                    conjModelo.add(str(codigoModelo))
                    conjVehicle.add(codigoTipoVeiculo)
    if len(conjMes) > 0:
        print("total mes - " + str(len(conjMes)))
    if len(conjMarca) > 0:
        print("total marcas - " + str(len(conjMarca)))
    if len(conjModelo) > 0:
        print("total modelo - " + str(len(conjModelo)))
    if len(conjVehicle) > 0:
        print("total veiculi - " + str(len(conjVehicle)))
    if conjTotalFiles > 0:
        print("total files - " + str(conjTotalFiles))
    print("---")


if __name__ == "__main__":
    print("meses")
    processFiles(MONTHS_PATH)
    print("marcas")
    processFiles(BRANDS_PATH)
    print("modelos")
    processFiles(MODELO_PATH)
    print("modelo (variacao)")
    processFiles(VARIACAO_PATH)
    print("preco")
    processFiles(PRICE_PATH)
