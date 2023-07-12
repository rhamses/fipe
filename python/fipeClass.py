import os
import logging
import requests
import json

def requestData(path, data = None):
  try:
    result = requests.post(path, data=data)
    body = result.json()
    if(result.status_code == 200 and "erro" not in body):
      return body
    else:
      raise Exception
  except Exception as e:
    logging.warning(path)
    logging.warning(data)
    logging.warning(result)
    logging.error("(requestData) - " + str(e))
    return False

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
    path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas"
    data = {
      'codigoTabelaReferencia': codigoTabelaReferencia,
      'codigoTipoVeiculo': codigoTipoVeiculo
    }
    result = requestData(path=path, data=data)
    return result
  except Exception as e:
    logging.error("(getMarcas) - " + str(e))

def getModelos(codigoTipoVeiculo, codigoTabelaReferencia, codigoMarca):
  try:
    path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos"
    data = {
      'codigoTabelaReferencia': codigoTabelaReferencia,
      'codigoTipoVeiculo': codigoTipoVeiculo,
      'codigoMarca': codigoMarca
    }
    result = requestData(path=path, data=data)
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

def saveData(folder, file, data, mode = "w"):
  try:
    checkFolder(folder)
    f = open(folder + "/" + file, mode)
    f.write(json.dumps(data))
    f.close()
    return True
  except Exception as e:
    logging.error("(saveData) - " + str(e))

def checkFolder(folder):
  folders = folder.split("/")
  currentFolder = ''
  for fl in folders:
    currentFolder += fl
    if(os.path.isdir(currentFolder) == False):
      os.mkdir(currentFolder)
    currentFolder += "/"