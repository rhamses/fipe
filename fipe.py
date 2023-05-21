#!/usr/bin/env python3
import requests
import os
import json
import threading
import queue
import time
import sys
import multiprocessing
from slugify import slugify
from google.cloud import storage
#from threading import Thread

NUM_PROC_VH = 3
NUM_PROC_AN = 5

q = queue.Queue()

def readFileFromGoogle(file, data):
  client = storage.Client(project='amb1-fipe')
  bucket = client.get_bucket("fipe-storage")
  blob = bucket.blob(file)
  content = ''
  with blob.open("r") as f:
    content = f.read()
    with blob.open("w") as f:
      content = content + "\n"+ json.dumps(data)
      f.write(content)
  return True

def uploadToGoogle(folder, data, fileName = "index.json"):
  client = storage.Client(project='amb1-fipe')
  bucket = client.get_bucket("fipe-storage")
  blob = bucket.blob(folder + "/" + fileName)
  result = blob.upload_from_string(json.dumps(data), content_type='application/json;charset=UTF-8')

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
    if(ano['Codigo'] == codigoTabelaReferencia):
      return ano['Mes']

def getAnos():
  result = requests.post("https://veiculos.fipe.org.br/api/veiculos/ConsultarTabelaDeReferencia")
  ## FOLDER
  result = result.json()
  # data = open("api/anos.json", 'w')
  # data.write(json.dumps(result))
  uploadToGoogle("anos", result)
  return result

def getMarcas(codigoTabelaReferencia, codigoTipoVeiculo, anos = None):
  url = "https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas"
  data = {
    'codigoTabelaReferencia': codigoTabelaReferencia,
    'codigoTipoVeiculo': codigoTipoVeiculo
  }
  result = requests.post(url, data = data)
  if(result.status_code == 200):
    result = result.json()
    # folder = checkFolder(
    #   codigoTabelaReferencia=codigoTabelaReferencia, 
    #   anos=anos
    # )
    # data = open(folder + "/_marcas.json", "a")
    # data.write(json.dumps(result))
    # uploadToGoogle(folder, result, '_marcas.json')
  else:
    readFileFromGoogle("errors.txt", data)
    result = None
  return result

def getModelos(codigoTipoVeiculo, codigoTabelaReferencia, codigoMarca, anos=None):
  url = "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos"
  data = {
    'codigoTabelaReferencia': codigoTabelaReferencia,
    'codigoTipoVeiculo': codigoTipoVeiculo,
    'codigoMarca': codigoMarca
  }
  result = requests.post(url, data = data)
  if(result.status_code == 200):
    result = result.json()
    ## FOLDER
    # folder = checkFolder(
    #   codigoTabelaReferencia=codigoTabelaReferencia, 
    #   anos=anos
    # )
    # data = open(folder + "/_modelos.json", "a")
    # data.write(json.dumps(result))
    # uploadToGoogle(folder, result, "_modelos.json")
    result = result['Modelos']
  else:
    readFileFromGoogle("errors.txt", data)
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
    readFileFromGoogle("errors.txt", data)
    result = None
  return result

def getPrice(codigoMarca, codigoModelo, codigoTabelaReferencia, codigoTipoCombustivel, codigoTipoVeiculo, anoModelo, anos):
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
    readFileFromGoogle("errors.txt", data)
    result = None
  return result

def init(vehicle):
  anos = getAnos()
  for ano in anos:
    codigoTabelaReferencia = ano['Codigo']
    codigoTipoVeiculo = vehicle
    ## Pega todas as marcas reference a um ano
    marcas = getMarcas(
      codigoTabelaReferencia=codigoTabelaReferencia,
      codigoTipoVeiculo=codigoTipoVeiculo,
      anos=anos
    )
    ## Carrega todos os modelos por marca
    if(marcas is not None):
      for marca in marcas:
        print("ano", codigoTabelaReferencia, "vehicle", codigoTipoVeiculo, "marca", marca)
        modelos = getModelos(
          codigoTipoVeiculo=codigoTipoVeiculo, 
          codigoTabelaReferencia=codigoTabelaReferencia, 
          codigoMarca=marca['Value'],
          anos=anos
        )
    ## Carrega o preço por variação se existir modelo
        if(modelos is not None):
          for modelo in modelos:
            if(modelo['Years'] is not None):
              for year in modelo['Years']:
                getPrice(
                  codigoMarca=modelo['Brand'],
                  codigoModelo=modelo['Value'],
                  codigoTabelaReferencia=codigoTabelaReferencia,
                  codigoTipoCombustivel=year['Value'].split("-")[1],
                  codigoTipoVeiculo=codigoTipoVeiculo,
                  anoModelo=year['Value'].split("-")[0],
                  anos=anos
                )
            else:
              readFileFromGoogle("errors.txt", {
                "scope": "loadPrice",
                "codigoTipoVeiculo": vehicle,
                "codigoTabelaReferencia": ano['Codigo'], 
                "codigoMarca": marca['Value']
              })
        else:
          readFileFromGoogle("errors.txt", {
            "scope": "loadModelos",
            "codigoTipoVeiculo": codigoTipoVeiculo, 
            "codigoTabelaReferencia": codigoTabelaReferencia, 
            "codigoMarca": marca['Value'],
          })
    else:
      readFileFromGoogle("errors.txt", {
        "scope": "loadMarcas",
        "codigoTipoVeiculo": codigoTipoVeiculo, 
        "codigoTabelaReferencia": codigoTabelaReferencia
      })

def closeQueueStartProcess(qz, target):
  # Adding breaking Item 
  qz.put(None)
  # Spawning Process
  process = multiprocessing.Process(target=target, args=(qz,))
  # Start Process
  process.start()

def consumeModeloDetailsProvidePrice(qx):
  while True:
    item = qx.get()
    if(item is None):
      break
    ## SPAWN PROCESS PRICE
    for year in item['Years']:
      price = getPrice(
        codigoMarca=item['codigoMarca'],
        codigoModelo=modelo['Value'],
        codigoTabelaReferencia=item['codigoTabelaReferencia'],
        codigoTipoCombustivel=year['Value'].split("-")[1],
        codigoTipoVeiculo=item['codigoTipoVeiculo'],
        anoModelo=year['Value'].split("-")[0],
        anos=anos
      )
      if(price is not None):
        # Folder
        folder = checkFolder(
          codigoTabelaReferencia = item['codigoTabelaReferencia'], 
          anos = anos,
          marca = price["Marca"],
          modelo = price["Modelo"],
          modeloAno = price["AnoModelo"],
          combustivel = price["Combustivel"]
        )
        uploadToGoogle(folder, price)
        print(price)

def consumeModeloProvidePrice(qx):
  while True:
    item = qx.get()
    if(item is None):
      break
    ## WRITE FILE TO GOOGLE
    folder = checkFolder(
      codigoTabelaReferencia=item['codigoTabelaReferencia'], 
      anos=anos
    )
    uploadToGoogle(folder, item['modelos'], "_modelos.json")
    ## SPAWN MORE PROCESS FOR MODELS DETAILS
    queueModeloDetail = multiprocessing.Queue()
    for index, modelo in enumerate(item['modelos']):
      details = getModelosAno(
        codigoTipoVeiculo=item['codigoTipoVeiculo'], 
        codigoTabelaReferencia=item['codigoTabelaReferencia'], 
        codigoMarca=item['codigoMarca'], 
        codigoModelo=modelo['Value']
      )
      if details is not None:
        if "erro" not in details:
          # item['modelos'][index]["Years"] = details
          # item['modelos'][index]["Brand"] = codigoMarca
          obj = {
            "modelo": modelo, 
            "codigoTabelaReferencia": ano['Codigo'],
            "codigoTipoVeiculo": codigoTipoVeiculo,
            "codigoMarca": marca['Value'],
            "years": details
          }
          queueModeloDetail.put(obj)
    closeQueueStartProcess(queueModeloDetail, consumeModeloDetailsProvidePrice)

def consumeMarcaProvideModelos(qx):
  while True:
    item = qx.get()
    if(item is None):
      break
    ## WRITE FILE TO GOOGLE
    folder = checkFolder(
      codigoTabelaReferencia=item['codigoTabelaReferencia'], 
      anos=anos
    )
    data = open(folder + "/_marcas.json", "a")
    data.write(json.dumps(item['marcas']))
    uploadToGoogle(folder, item['marcas'], '_marcas.json')
    ## SPAWN MORE PROCESS FOR MODELS
    queueModelo = multiprocessing.Queue()
    for marca in item['marcas']:
      modelos = getModelos(
        codigoTipoVeiculo=item['codigoTipoVeiculo'], 
        codigoTabelaReferencia=item['codigoTabelaReferencia'], 
        codigoMarca=marca['Value']
      )
      if modelos is not None:
        if "erro" not in modelos:
          obj = {
            "modelos": modelos, 
            "codigoTabelaReferencia": ano['Codigo'],
            "codigoTipoVeiculo": codigoTipoVeiculo,
            "codigoMarca": marca['Value']
          }
          queueModelo.put(obj)
    closeQueueStartProcess(queueModelo, consumeModeloProvideModeloDetails)

if __name__ == "__main__":
  vehicles = [1,2,3]
  anos = getAnos()
  for ano in anos:
    queueMarca = multiprocessing.Queue()
    for codigoTipoVeiculo in vehicles:
      marcas = getMarcas(
        codigoTabelaReferencia=ano['Codigo'],
        codigoTipoVeiculo=codigoTipoVeiculo
      )
      if marcas is not None:
        if "erro" not in marcas:
          obj = {
            "marcas": marcas, 
            "codigoTabelaReferencia": ano['Codigo'],
            "codigoTipoVeiculo": codigoTipoVeiculo
          }
          queueMarca.put(obj)
    closeQueueStartProcess(queueMarca, consumeMarcaProvideModelos)

  #### SCOPES
  #
  # 0. Veiculos
  # 1. Anos
  # 2. Marcas
  # 3. Modelos => 
  # 4. Modelos Detalhes => 
  # 5. Price => 
  #