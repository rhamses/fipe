#!/usr/bin/env python3
import requests
import os
import json
from slugify import slugify
from google.cloud import storage
from threading import Thread
import time
import sys
import multiprocessing

NUM_PROC_VH = 3
NUM_PROC_AN = 5

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

def getMarcas(codigoTabelaReferencia, codigoTipoVeiculo, anos):
  url = "https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas"
  data = {
    'codigoTabelaReferencia': codigoTabelaReferencia,
    'codigoTipoVeiculo': codigoTipoVeiculo
  }
  result = requests.post(url, data = data)
  if(result.status_code == 200):
    result = result.json()
    folder = checkFolder(
      codigoTabelaReferencia=codigoTabelaReferencia, 
      anos=anos
    )
    # data = open(folder + "/_marcas.json", "a")
    # data.write(json.dumps(result))
    uploadToGoogle(folder, result, '_marcas.json')
  else:
    readFileFromGoogle("errors.txt", data)
    result = None
  return result

def getModelos(codigoTipoVeiculo, codigoTabelaReferencia, codigoMarca, anos):
  url = "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos"
  data = {
    'codigoTabelaReferencia': codigoTabelaReferencia,
    'codigoTipoVeiculo': codigoTipoVeiculo,
    'codigoMarca': codigoMarca
  }
  result = requests.post(url, data = data)
  if(result.status_code == 200):
    result = result.json()
    # Get Years from Modelos
    for index, modelo in enumerate(result['Modelos']):
      item = getModelosAno(
        codigoTipoVeiculo=codigoTipoVeiculo, 
        codigoTabelaReferencia=codigoTabelaReferencia, 
        codigoMarca=codigoMarca, 
        codigoModelo=modelo['Value']
      )
      result['Modelos'][index]["Years"] = item
      result['Modelos'][index]["Brand"] = codigoMarca
    ## FOLDER
    folder = checkFolder(
      codigoTabelaReferencia=codigoTabelaReferencia, 
      anos=anos
    )
    # data = open(folder + "/_modelos.json", "a")
    # data.write(json.dumps(result))
    uploadToGoogle(folder, result, "_modelos.json")
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
    # Folder
    folder = checkFolder(
      codigoTabelaReferencia = codigoTabelaReferencia, 
      anos = anos,
      marca = result["Marca"],
      modelo = result["Modelo"],
      modeloAno = result["AnoModelo"],
      combustivel = result["Combustivel"]
    )
    # data = open(folder + "/index.json", "w")
    # data.write(json.dumps(result))
    uploadToGoogle(folder, result)
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

if __name__ == "__main__":
  vh = [1,2,3]
  jobs = []
  for v in vh:
    process = multiprocessing.Process(
			target=init, 
      args=(str(v))
		)
    jobs.append(process)
  for job in jobs:
    job.start()
  for job in jobs:
    job.join()