#!/usr/bin/env python3
import requests
import os
import json
import logging
# import sys
import threading
# import queue
# import time
# import sys
# import multiprocessing
from slugify import slugify
# from google.cloud import storage
from datetime import datetime
from time import sleep
#from threading import Thread

logFile = "output-" + str(datetime.now()) + ".log"
logging.basicConfig(filename=logFile, encoding='utf-8', level=logging.DEBUG)

def requestData(path, saveInFile = None, saveInFileMode = "w", data = None):
  try:
    args = locals()
    sleep(5)
    result = requests.post(path, data=data)
    body = result.json()
    if(result.status_code == 200 and "erro" not in body):
      if(saveInFile is not None):
        saveData(saveInFile, body, saveInFileMode)
      return body
    else:
      return None
  except Exception as e:
    logging.warning(args)
    logging.warning(result)
    logging.error("(requestData) - " + str(e))

def saveData(file, data, mode = "w"):
  try:
    f = open(file, mode)
    f.write(json.dumps(data) + "\n")
    f.close()
    return True
  except Exception as e:
    logging.error("(saveData) - " + str(e))

def checkFolder(codigoTabelaReferencia, anos = None, marca = None, modelo = None, modeloAno = None, combustivel = None, mes = None):
  if(mes == None):
    mes = getMes(
      codigoTabelaReferencia = codigoTabelaReferencia,
      anos = anos
    )
  folder = False
  if(mes is not None):
    folder = slugify(mes.split("/")[1])
    if(os.path.isdir(folder) == False):
      os.mkdir(folder)
    folder += "/" + slugify(mes.split("/")[0])
    if(os.path.isdir(folder) == False):
      os.mkdir(folder)
  if(marca is not None):
    folder += "/" + slugify(marca)
    if(os.path.isdir(folder) == False):
      os.mkdir(folder)
  if(modelo is not None):
    folder += "/" + slugify(modelo)
    if(os.path.isdir(folder) == False):
      os.mkdir(folder)
  if(modeloAno is not None):
    folder += "/" + slugify(str(modeloAno))
    if(os.path.isdir(folder) == False):
      os.mkdir(folder)
  if(combustivel is not None):
    folder += "/" + slugify(combustivel)
    if(os.path.isdir(folder) == False):
      os.mkdir(folder)
  return folder

def checkFile(file):
  try:
    if(os.path.isfile(file)):
      f = open(file)
      if ".json" in file:
        return json.loads(f.readlines()[0])
      else:
        return f.readlines()
    else:
      return False
  except Exception as e:
    logging.error("(checkFile) - " + str(e))

def createFolder(folder):
  pieces = folder.split("/")
  fl = ''
  for piece in pieces:
    fl += piece + "/"
    if(os.path.isdir(fl) == False):
      os.mkdir(fl)

def mapAnos(anosFile, vehicleIndex):
  global doneFile
  newList = []
  if(doneFile[vehicleIndex] is not False):
    for ano in anosFile:
      if(ano is not None and ano['Codigo'] <= doneFile[vehicleIndex]['codigoTabelaReferencia']):
        newList.append(ano)
    return newList
  else:
    return anosFile

def mapMarcas(marcas, vehicleIndex):
  if(doneFile[vehicleIndex] is not False):
    for index, marca in enumerate(marcas):
      if(marca is not None and int(marca['Value']) != int(doneFile[vehicleIndex]['codigoMarca'])):
        marcas[index] = None
      else:
        break
  return marcas

def mapModelos(modelos, vehicleIndex):
  if(doneFile[vehicleIndex] is not False):
    for index, modelo in enumerate(modelos):
      if(modelo is not None and int(modelo['Value']) != int(doneFile[vehicleIndex]['codigoModelo'])):
        modelos[index] = None
      else:
        break
  return modelos

def getAnos(vehicleIndex):
  try:
    anosFile = checkFile("anos.json")
    if(anosFile):
      result = mapAnos(anosFile, vehicleIndex)
    else:
      result = requestData(
        path="https://veiculos.fipe.org.br/api/veiculos/ConsultarTabelaDeReferencia",
        saveInFile="anos.json"
      )
    return result
  except Exception as e:
    logging.error("(getAnos) - " + str(e))

def getMarcas(codigoTabelaReferencia, codigoTipoVeiculo, mesTabelaReferencia, vehicleIndex):
  try:
    fileSave = "_marcas_" + str(codigoTipoVeiculo) + ".json"
    fileName = checkFolder(codigoTabelaReferencia=codigoTabelaReferencia, mes=mesTabelaReferencia) + "/" + fileSave
    hasFile = checkFile(fileName)
    if(hasFile):
      result = mapMarcas(
        marcas=hasFile, 
        vehicleIndex=vehicleIndex
      )
    else:
      path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas"
      data = {
        'codigoTabelaReferencia': codigoTabelaReferencia,
        'codigoTipoVeiculo': codigoTipoVeiculo
      }
      result = requestData(path=path, saveInFile=fileName, data=data)
    return result
  except Exception as e:
    logging.error("(getMarcas) - " + str(e))

def getModelos(codigoTipoVeiculo, codigoTabelaReferencia, codigoMarca, mesTabelaReferencia, vehicleIndex):
  try:
    fileSave = "_modelos_" + str(codigoTipoVeiculo) + "_" + str(codigoMarca) + ".json"
    fileName = checkFolder(codigoTabelaReferencia=codigoTabelaReferencia, mes=mesTabelaReferencia) + "/" + fileSave
    hasFile = checkFile(fileName)
    if(hasFile and "Modelos" in hasFile):
      result = mapModelos(
        modelos=hasFile['Modelos'], 
        vehicleIndex=vehicleIndex
      )
    else:
      path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos"
      data = {
        'codigoTabelaReferencia': codigoTabelaReferencia,
        'codigoTipoVeiculo': codigoTipoVeiculo,
        'codigoMarca': codigoMarca
      }
      result = requestData(path=path, saveInFile=fileName, data=data)
      if("Modelos" in result):
        result = result['Modelos']
    return result
  except Exception as e:
    logging.error("(getModelos) - " + str(e))

def getModelosAno(codigoTipoVeiculo, codigoTabelaReferencia, codigoMarca, codigoModelo):
  try:
    path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarAnoModelo"
    data = {
      'codigoTabelaReferencia': codigoTabelaReferencia,
      'codigoTipoVeiculo': codigoTipoVeiculo,
      'codigoMarca': codigoMarca,
      'codigoModelo': codigoModelo
    }
    return requestData(path=path, data=data)
  except Exception as e:
    logging.error("(getModelosAno) - " + str(e))

def getPrice(codigoMarca, codigoModelo, codigoTabelaReferencia, codigoTipoCombustivel, codigoTipoVeiculo, anoModelo, marca, modelo, mesTabelaReferencia):
  try:
    if(int(codigoTipoCombustivel) == 1):
      combustivel = "Gasolina"
    elif(int(codigoTipoCombustivel) == 2):
      combustivel = "Álcool"
    elif(int(codigoTipoCombustivel) == 3):
      combustivel = "Diesel"
    else:
      combustivel = codigoTipoCombustivel
    folder = checkFolder(
      codigoTabelaReferencia = codigoTabelaReferencia, 
      mes=mesTabelaReferencia,
      marca = slugify(marca['Label']),
      modelo = slugify(modelo['Label']),
      modeloAno = anoModelo,
      combustivel = slugify(combustivel)
    )
    fileSave = folder + "/index.json"
    path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTodosParametros"
    data = {
      "codigoMarca": codigoMarca,
      "codigoModelo": codigoModelo,
      "codigoTabelaReferencia": codigoTabelaReferencia,
      "codigoTipoCombustivel": codigoTipoCombustivel,
      "codigoTipoVeiculo": codigoTipoVeiculo,
      "anoModelo": anoModelo,
      "tipoConsulta": "tradicional"
    }
    return requestData(path=path, data=data, saveInFile=fileSave)
  except Exception as e:
    logging.error("(getPrice) - " + str(e))

def processPrice(marca, modelo, year, codigoTipoVeiculo, codigoTabelaReferencia, mesTabelaReferencia, modeloIndex):
  ## Variaveis
  codigoMarca = marca['Value']
  codigoModelo = modelo['Value']
  codigoTipoCombustivel= year['Value'].split("-")[1]
  anoModelo= year['Value'].split("-")[0]
  ## LOOP MODELO YEARS TO RETRIEVE FOR PRICE
  price = getPrice(
    codigoMarca=codigoMarca,
    codigoModelo=codigoModelo,
    codigoTabelaReferencia=codigoTabelaReferencia,
    codigoTipoCombustivel=codigoTipoCombustivel,
    codigoTipoVeiculo=codigoTipoVeiculo,
    anoModelo=anoModelo,
    marca=marca,
    modelo=modelo,
    mesTabelaReferencia=mesTabelaReferencia
  )
  if price is not None and "erro" not in price :
    result = {
      "codigoMarca": codigoMarca,
      "codigoModelo": codigoModelo,
      "codigoTabelaReferencia": codigoTabelaReferencia,
      "codigoTipoCombustivel": codigoTipoCombustivel,
      "codigoTipoVeiculo": codigoTipoVeiculo,
      "anoModelo": anoModelo,
      "modeloNumero": modeloIndex + 1
    }
    saveData("done_" + str(codigoTipoVeiculo) + ".json", result, "w")

def processModelos(marca, codigoTipoVeiculo, codigoTabelaReferencia, mesTabelaReferencia, vehicleIndex):
  try:
    codigoMarca = marca['Value']
    modelos = getModelos(
      codigoTipoVeiculo=codigoTipoVeiculo, 
      codigoTabelaReferencia=codigoTabelaReferencia, 
      codigoMarca=codigoMarca,
      mesTabelaReferencia=mesTabelaReferencia,
      vehicleIndex=vehicleIndex
    )
    if modelos is not None and "erro" not in modelos:
      print({
        "codigoTipoVeiculo": codigoTipoVeiculo, 
        "codigoTabelaReferencia": codigoTabelaReferencia, 
        "codigoMarca": codigoMarca,
        "mesTabelaReferencia": mesTabelaReferencia,
        "totalModelos": len(modelos),
      })
      priceThreads = []
      for index, modelo in enumerate(modelos):
        if(modelo is not None):
          years = getModelosAno(
            codigoTipoVeiculo=codigoTipoVeiculo, 
            codigoTabelaReferencia=codigoTabelaReferencia, 
            codigoMarca=codigoMarca,
            codigoModelo=modelo['Value']
          )
          if years is not None and "erro" not in years:
            for year in years:
              t = threading.Thread(
                target=processPrice,
                args=(
                  marca,
                  modelo,
                  year,
                  codigoTipoVeiculo,
                  codigoTabelaReferencia,
                  mesTabelaReferencia,
                  index
                )
              )
              priceThreads.append(t)
      startThreads(priceThreads)
  except Exception as e:
    logging.error("(processModelos) - " + str(e))

def startThreads(threads):
  for t in threads:
    sleep(5)
    t.start()
  for t in threads:
    t.join()

def init(vehicleIndex):
  try:
    startedThread = False
    codigoTipoVeiculo = vehicleIndex + 1
    anos = getAnos(vehicleIndex=vehicleIndex)
    for ano in anos:
      codigoTabelaReferencia = ano['Codigo']
      mesTabelaReferencia = ano['Mes']
      marcas = getMarcas(
        codigoTabelaReferencia=codigoTabelaReferencia,
        codigoTipoVeiculo=codigoTipoVeiculo,
        mesTabelaReferencia=mesTabelaReferencia,
        vehicleIndex=vehicleIndex
      )
      if marcas is not None and "erro" not in marcas:
        modelosThreads = []
        for marca in marcas:
          if(marca is not None):
            t = threading.Thread(target=processModelos, args=(
                marca, 
                codigoTipoVeiculo, 
                codigoTabelaReferencia, 
                mesTabelaReferencia,
                vehicleIndex
              )
            )
            modelosThreads.append(t)
        startThreads(modelosThreads)
  except Exception as e:
    logging.error("(init) - " + str(e))

if __name__ == "__main__":
  try:
    doneFile = [checkFile("done_1.json"), checkFile("done_2.json"), checkFile("done_3.json")]
    vehicle = 0
    threads = []
    #######TEST CALLS############
    # anos = getAnos(1)
    # print(anos)
    #
    # marcas = getMarcas(259, 2, "agosto/2020", 1)
    # print(marcas)
    # 
    # modelos = getModelos(
    #   codigoTipoVeiculo=2,
    #   codigoTabelaReferencia=259,
    #   codigoMarca=94,
    #   mesTabelaReferencia="julho/2021",
    #   vehicleIndex=1
    # )
    # print(modelos)
    # exit()
    #
    # price = getPrice(
    #   codigoMarca=72,
    #   codigoModelo=2673,
    #   codigoTabelaReferencia=259,
    #   codigoTipoCombustivel=1,
    #   codigoTipoVeiculo=2,
    #   anoModelo=1996,
    #   marca=marcas[0], 
    #   modelo=modelos[0],
    #   mesTabelaReferencia="agosto/2020"
    # )
    # print(price)
    # exit()
    # init(1)
    # exit()
    #######END TEST CALLS########
    while vehicle < 3:
      t = threading.Thread(target=init, args=(vehicle,))
      threads.append(t)
      vehicle = vehicle + 1
    startThreads(threads)
  except Exception as e:
    logging.error("(main) - " + str(e))
    pass