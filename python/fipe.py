#!/usr/bin/env python3
import requests
import os
import json
# import sys
# import threading
# import queue
# import time
# import sys
# import multiprocessing
from slugify import slugify
from google.cloud import storage
#from threading import Thread

def readFileFromGoogle(file):
  try:
    # client = storage.Client(project='amb1-fipe')
    # bucket = client.get_bucket("fipe-storage")
    # blob = bucket.blob(file)
    # with blob.open("r") as f:
    #   content = f.read()
    #   if ".json" in file:
    #     return json.loads(content)
    #   else:
    #     return content
    with open(file) as f:
      return f.readlines()
  except:
    return False

def appendFileFromGoogle(file, data, mode = "a"):
  try:
    # client = storage.Client(project='amb1-fipe')
    # bucket = client.get_bucket("fipe-storage")
    # blob = bucket.blob(file)
    # content = ''
    # with blob.open("r") as f:
    #   content = f.read()
    #   with blob.open("w") as f:
    #     if ".json" in file:
    #       content = json.loads(content)
    #       content.append(data[0])
    #       f.write(json.dumps(content))
    #     elif ".txt" in file:
    #       content = content + "\n"+ json.dumps(data)
    #       f.write(content)

    #     if ".json" in file:
    #       content = json.loads(content)
    #       content.append(data[0])
    #       f.write(json.dumps(content))
    #     elif ".txt" in file:
    #       content = content + "\n"+ json.dumps(data)
    #       f.write(content)
    f = open(file, mode)
    f.write(json.dumps(data) + "\n")
    f.close()
    return True
  except:
    return uploadToGoogle(file, data)

def uploadToGoogle(folder, data, fileName = "index.json"):
  try:
    if ".json" in fileName:
      contentType = "application/json;charset=UTF-8"
    elif ".txt" in fileName:
      contentType = "text/plain"
    ###
    # client = storage.Client(project='amb1-fipe')
    # bucket = client.get_bucket("fipe-storage")
    # blob = bucket.blob(folder)
    # result = blob.upload_from_string(json.dumps(data), content_type=contentType)
    ###
    f = open(folder + '/' + fileName, 'w')
    f.write(json.dumps(data))
    f.close()
  except:
    return False

def checkFolder(codigoTabelaReferencia, anos, marca = None, modelo = None, modeloAno = None, combustivel = None):
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

def getMes(codigoTabelaReferencia, anos):
  for ano in anos:
    if(ano is not None):
      if(ano['Codigo'] == codigoTabelaReferencia):
        return ano['Mes']

def checkFile(file):
  if(os.path.isfile(file)):
    f = open(file)
    if ".json" in file:
      return json.loads(f.readlines()[0])
    else:
      return f.readlines()
  else:
    return False

def mapAnos(ano):
  if(ano is not None and ano['Codigo'] <= doneFile['codigoTabelaReferencia']):
    return ano

def mapMarcas(marcas):
  for index, marca in enumerate(marcas):
    if(marca is not None and int(marca['Value']) != int(doneFile['codigoMarca'])):
      marcas[index] = None
    else:
      break
  return marcas

def mapModelos(modelos):
  for index, modelo in enumerate(modelos):
    if(modelo is not None and int(modelo['Value']) != int(doneFile['codigoModelo'])):
      modelos[index] = None
    else:
      break
  return modelos


def getAnos(doneFile):
  if(doneFile is not False):
    anosFile = checkFile("anos.json")
    newDoneFile = map(mapAnos, anosFile)
    result = list(newDoneFile)
  else:
    result = requests.post("https://veiculos.fipe.org.br/api/veiculos/ConsultarTabelaDeReferencia")
    result = result.json()
  appendFileFromGoogle("anos.json", result, "w")
  return result

def loadMarcas(codigoTabelaReferencia, codigoTipoVeiculo):
  url = "https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas"
  data = {
    'codigoTabelaReferencia': codigoTabelaReferencia,
    'codigoTipoVeiculo': codigoTipoVeiculo
  }
  result = requests.post(url, data = data)
  if(result.status_code == 200):
    result = result.json()
  else:
    appendFileFromGoogle("errors.txt", data)
    result = None
  return result

def getMarcas(codigoTabelaReferencia, codigoTipoVeiculo, anos):
  if(doneFile is not False):
    fileName = checkFile(checkFolder(codigoTabelaReferencia, anos) + "/_marcas_" + str(codigoTipoVeiculo) + ".json")
    if(fileName is False):
      fileName = loadMarcas(codigoTabelaReferencia=codigoTabelaReferencia, codigoTipoVeiculo=codigoTipoVeiculo)
    fileNameFiltered = mapMarcas(fileName)
    result = list(fileNameFiltered)
  else:
    result = loadMarcas(codigoTabelaReferencia=codigoTabelaReferencia, codigoTipoVeiculo=codigoTipoVeiculo)
  return result

def getModelos(codigoTipoVeiculo, codigoTabelaReferencia, codigoMarca, anos=None):
  # if(doneFile is not False):
  #   fileName = checkFile(checkFolder(codigoTabelaReferencia, anos) + "/_modelos.json")
  #   fileNameFiltered = mapModelos(fileName)
  #   result = list(fileNameFiltered)
  # else:
  url = "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos"
  data = {
    'codigoTabelaReferencia': codigoTabelaReferencia,
    'codigoTipoVeiculo': codigoTipoVeiculo,
    'codigoMarca': codigoMarca
  }
  result = requests.post(url, data = data)
  if(result.status_code == 200):
    result = result.json()
    result = result['Modelos']
  else:
    appendFileFromGoogle("errors.txt", data)
    result = None
  return result

def getModelosAno(codigoTipoVeiculo, codigoTabelaReferencia, codigoMarca, codigoModelo):
  url = "https://veiculos.fipe.org.br/api/veiculos//ConsultarAnoModelo"
  data = {
    'codigoTabelaReferencia': codigoTabelaReferencia,
    'codigoTipoVeiculo': codigoTipoVeiculo,
    'codigoMarca': codigoMarca,
    'codigoModelo': codigoModelo
  }
  result = requests.post(url, data = data)
  if(result.status_code == 200):
    result = result.json()
  else:
    appendFileFromGoogle("errors.txt", data)
    result = None
  return result

def getPrice(codigoMarca, codigoModelo, codigoTabelaReferencia, codigoTipoCombustivel, codigoTipoVeiculo, anoModelo):
  url = "https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTodosParametros"
  data = {
    "codigoMarca": codigoMarca,
    "codigoModelo": codigoModelo,
    "codigoTabelaReferencia": codigoTabelaReferencia,
    "codigoTipoCombustivel": codigoTipoCombustivel,
    "codigoTipoVeiculo": codigoTipoVeiculo,
    "anoModelo": anoModelo,
    "tipoConsulta": "tradicional"
  }
  result = requests.post(url, data = data)
  if(result.status_code == 200):
    result = result.json()
    del result['DataConsulta']
    del result['Autenticacao']
    del result['MesReferencia']
  else:
    appendFileFromGoogle("errors.txt", data)
    result = None
  return result

# def init(vehicle):
#   anos = getAnos()
#   for ano in anos:
#     codigoTabelaReferencia = ano['Codigo']
#     codigoTipoVeiculo = vehicle
#     ## Pega todas as marcas reference a um ano
#     marcas = getMarcas(
#       codigoTabelaReferencia=codigoTabelaReferencia,
#       codigoTipoVeiculo=codigoTipoVeiculo,
#       anos=anos
#     )
#     ## Carrega todos os modelos por marca
#     if(marcas is not None):
#       for marca in marcas:
#         modelos = getModelos(
#           codigoTipoVeiculo=codigoTipoVeiculo, 
#           codigoTabelaReferencia=codigoTabelaReferencia, 
#           codigoMarca=marca['Value'],
#           anos=anos
#         )
#     ## Carrega o preço por variação se existir modelo
#         if(modelos is not None):
#           for modelo in modelos:
#             if(modelo['Years'] is not None):
#               for year in modelo['Years']:
#                 getPrice(
#                   codigoMarca=modelo['Brand'],
#                   codigoModelo=modelo['Value'],
#                   codigoTabelaReferencia=codigoTabelaReferencia,
#                   codigoTipoCombustivel=year['Value'].split("-")[1],
#                   codigoTipoVeiculo=codigoTipoVeiculo,
#                   anoModelo=year['Value'].split("-")[0],
#                   anos=anos
#                 )
#             else:
#               appendFileFromGoogle("errors.txt", {
#                 "scope": "loadPrice",
#                 "codigoTipoVeiculo": vehicle,
#                 "codigoTabelaReferencia": ano['Codigo'], 
#                 "codigoMarca": marca['Value']
#               })
#         else:
#           appendFileFromGoogle("errors.txt", {
#             "scope": "loadModelos",
#             "codigoTipoVeiculo": codigoTipoVeiculo, 
#             "codigoTabelaReferencia": codigoTabelaReferencia, 
#             "codigoMarca": marca['Value'],
#           })
#     else:
#       appendFileFromGoogle("errors.txt", {
#         "scope": "loadMarcas",
#         "codigoTipoVeiculo": codigoTipoVeiculo, 
#         "codigoTabelaReferencia": codigoTabelaReferencia
#       })

def isModelExists(codigoMarca, codigoModelo, codigoTabelaReferencia, codigoTipoVeiculo):
  # print("chamou", codigoMarca, codigoModelo, codigoTabelaReferencia, codigoTipoVeiculo)
  uploadedFiles = readFileFromGoogle("done.json")
  if uploadedFiles is not False:
    item = json.loads(uploadedFiles[0])
    if(
        int(item["codigoMarca"]) == int(codigoMarca) and
        int(item["codigoModelo"]) == int(codigoModelo) and
        int(item["codigoTabelaReferencia"]) == int(codigoTabelaReferencia) and
        int(item["codigoTipoVeiculo"]) == int(codigoTipoVeiculo)
      ):
      # print("deu false")
      return True
    else:
      return False

def init():
  vehicles = [1,2,3]
  anos = getAnos(doneFile=doneFile)
  for ano in anos:
    if(ano is not None):
      for codigoTipoVeiculo in vehicles:
        ####
        # codigoTipoVeiculo = 3
        marcas = getMarcas(
          codigoTabelaReferencia=ano['Codigo'],
          codigoTipoVeiculo=codigoTipoVeiculo,
          anos=anos
        )
        if marcas is not None and "erro" not in marcas:
          ## WRITE MARCAS FROM EACH MONTH
          folder = checkFolder(ano['Codigo'], anos) + "/_marcas_" + str(codigoTipoVeiculo) + ".json"
          appendFileFromGoogle(folder, marcas, mode="w")
          ##
          # exit()
          ## LOOP MARCAS
          for marca in marcas:
            if(marca is not None):
              modelos = getModelos(
                codigoTipoVeiculo=codigoTipoVeiculo, 
                codigoTabelaReferencia=ano['Codigo'], 
                codigoMarca=marca['Value'],
                anos=anos
              )
              print({
                "codigoTipoVeiculo": codigoTipoVeiculo, 
                "codigoTabelaReferencia": ano['Codigo'], 
                "codigoMarca": marca["Value"],
                "nomeMarca": marca["Label"],
                "totalModelos": len(modelos)
              })
              if modelos is not None and "erro" not in modelos:
                ## WRITE MODELOS FROM EACH MONTH
                folder = checkFolder(ano['Codigo'], anos) + "/_modelos.json"
                appendFileFromGoogle(folder, modelos)
                ## LOOP MODELOS TO RETRIEVE MODELO YEARS
                for index, modelo in enumerate(modelos):
                  # print({
                  #   "codigoTipoVeiculo": codigoTipoVeiculo, 
                  #   "codigoTabelaReferencia": ano['Codigo'], 
                  #   "codigoMarca": marca['Label'],
                  #   "codigoModelo": modelo['Value']
                  # })
                  if(modelo is not None):
                    ## CONTINUE LOOP
                    years = getModelosAno(
                      codigoTipoVeiculo=codigoTipoVeiculo, 
                      codigoTabelaReferencia=ano['Codigo'], 
                      codigoMarca=marca['Value'],
                      codigoModelo=modelo['Value']
                    )
                    if years is not None and "erro" not in years:
                      ## LOOP MODELO YEARS TO RETRIEVE FOR PRICE
                      for year in years:
                        price = getPrice(
                          codigoMarca=marca['Value'],
                          codigoModelo=modelo['Value'],
                          codigoTabelaReferencia=ano['Codigo'],
                          codigoTipoCombustivel=year['Value'].split("-")[1],
                          codigoTipoVeiculo=codigoTipoVeiculo,
                          anoModelo=year['Value'].split("-")[0]
                        )
                        if price is not None and "erro" not in price:
                          folder = checkFolder(
                            codigoTabelaReferencia = ano['Codigo'], 
                            anos = anos,
                            marca = price["Marca"],
                            modelo = price["Modelo"],
                            modeloAno = price["AnoModelo"],
                            combustivel = price["Combustivel"]
                          )
                          uploadToGoogle(folder, price)
                          ## WRITE DONE.TXT
                          # print("index", index)
                          result = {
                            "codigoMarca": marca['Value'],
                            "codigoModelo": modelo['Value'],
                            "codigoTabelaReferencia": ano['Codigo'],
                            "codigoTipoCombustivel": year['Value'].split("-")[1],
                            "codigoTipoVeiculo": codigoTipoVeiculo,
                            "anoModelo": year['Value'].split("-")[0],
                            "modeloNumero": index + 1
                          }
                          appendFileFromGoogle("done.json", result, "w")
                          # print(json.dumps(result))
                        else:
                          appendFileFromGoogle("errors.txt", {
                            "scope": "price",
                            "codigoTabelaReferencia": ano['Codigo'],
                            "codigoTipoVeiculo": codigoTipoVeiculo,
                            "codigoMarca": marca['Value'],
                            "codigoModelo": modelo['Value'],
                            "codigoTipoCombustivel": year['Value'].split("-")[1],
                            "anoModelo": year['Value'].split("-")[0]
                          })
                    else:
                      appendFileFromGoogle("errors.txt", {
                        "scope": "years",
                        "codigoTabelaReferencia": ano['Codigo'],
                        "codigoTipoVeiculo": codigoTipoVeiculo,
                        "codigoMarca": marca['Value'],
                        "codigoModelo": modelo['Value']
                      })
              else:
                appendFileFromGoogle("errors.txt", {
                  "scope": "modelos",
                  "codigoTabelaReferencia": ano['Codigo'],
                  "codigoTipoVeiculo": codigoTipoVeiculo,
                  "codigoMarca": marca['Value']
                })
        else:
          appendFileFromGoogle("errors.txt", {
            "scope": "marcas",
            "codigoTabelaReferencia": ano['Codigo'],
            "codigoTipoVeiculo": codigoTipoVeiculo
          })

if __name__ == "__main__":
  try:
    doneFile = checkFile("done.json")
    init()
  except:
    init()