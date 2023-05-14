import requests
import os
import json
from slugify import slugify
from google.cloud import storage
import time

def uploadToGoogle(folder, data):
  client = storage.Client(project='amb1-fipe')
  bucket = client.get_bucket("fipe-storage")
  blob = bucket.blob(folder + "/index.json")
  result = blob.upload_from_string(json.dumps(data), content_type='application/json;charset=UTF-8')

def checkFolder(codigoTabelaReferencia, anos, marca = None, modelo = None, modeloAno = None, combustivel = None):
  mes = getMes(
    codigoTabelaReferencia = codigoTabelaReferencia,
    anos = anos
  )
  folder = False
  if(mes is not None):
    folder = "api/" + slugify(mes.split("/")[1])
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
  data = open("api/anos.json", 'w')
  data.write(json.dumps(result))
  return result

def getMarcas(codigoTabelaReferencia, codigoTipoVeiculo, anos):
  url = "https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas"
  data = {
    'codigoTabelaReferencia': codigoTabelaReferencia,
    'codigoTipoVeiculo': codigoTipoVeiculo
  }
  result = requests.post(url, data = data)
  result = result.json()
  folder = checkFolder(
    codigoTabelaReferencia=codigoTabelaReferencia, 
    anos=anos
  )
  data = open(folder + "/_marcas.json", "a")
  data.write(json.dumps(result))
  return result

def getModelos(codigoTipoVeiculo, codigoTabelaReferencia, codigoMarca, anos):
  url = "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos"
  data = {
    'codigoTabelaReferencia': codigoTabelaReferencia,
    'codigoTipoVeiculo': codigoTipoVeiculo,
    'codigoMarca': codigoMarca
  }
  result = requests.post(url, data = data)
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
  data = open(folder + "/_modelos.json", "a")
  data.write(json.dumps(result))
  return result['Modelos']

def getModelosAno(codigoTipoVeiculo, codigoTabelaReferencia, codigoMarca, codigoModelo):
  url = "https://veiculos.fipe.org.br/api/veiculos//ConsultarAnoModelo"
  data = {
    'codigoTabelaReferencia': codigoTabelaReferencia,
    'codigoTipoVeiculo': codigoTipoVeiculo,
    'codigoMarca': codigoMarca,
    'codigoModelo': codigoModelo
  }
  result = requests.post(url, data = data)
  return result.json()

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
  data = open(folder + "/index.json", "w")
  data.write(json.dumps(result))
  # uploadToGoogle(folder, result)
  return result

vehicles = [1, 2, 3]
anos = getAnos()
for vehicle in vehicles:
  for ano in anos:
    marcas = getMarcas(
      codigoTabelaReferencia=ano['Codigo'],
      codigoTipoVeiculo=vehicle,
      anos=anos
    )
    for marca in marcas:
      print("ano", ano['Codigo'], "vehicle", vehicle, "marca", marca)
      time.sleep(1)
      modelos = getModelos(
        codigoTipoVeiculo=vehicle, 
        codigoTabelaReferencia=ano['Codigo'], 
        codigoMarca = marca['Value'],
        anos = anos
      )
      for modelo in modelos:
        for year in modelo['Years']:
          getPrice(
            codigoMarca=modelo['Brand'],
            codigoModelo=modelo['Value'],
            codigoTabelaReferencia=ano['Codigo'],
            codigoTipoCombustivel=year['Value'].split("-")[1],
            codigoTipoVeiculo=vehicle,
            anoModelo=year['Value'].split("-")[0],
            anos=anos
          )