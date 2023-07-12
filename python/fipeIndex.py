import logging
import json
import threading
import math
from fipeClass import saveData, requestData
from datetime import datetime
from os import walk
logFile = "output-index-" + str(datetime.now()) + ".log"
logging.basicConfig(filename=logFile, encoding='utf-8')

'''
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
'''

def processMeses():
  try:
    # write anos onto folder
    folder = "indexes"
    fileName = 'meses.json'
    result = requestData(
      path="https://veiculos.fipe.org.br/api/veiculos/ConsultarTabelaDeReferencia"
    )
    saveData(
      folder=folder,
      file=fileName,
      data=result
    )
  except Exception as e:
    logging.error("(processMeses) - " + str(e))

def processMarcas(vehicleIndex):
  try:
    # Le pasta anos
    with open('indexes/meses.json') as meses:
      meses = json.load(meses)
      for mes in meses:
        codigoTabelaReferencia = mes['Codigo']
        path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarMarcas"
        data = {
          "codigoTabelaReferencia": codigoTabelaReferencia,
          "codigoTipoVeiculo": vehicleIndex
        }
        result = requestData(
          path=path,
          data=data
        )
        # write marcas onto folder
        folder = "indexes/marcas"
        fileName = f'{codigoTabelaReferencia}-{vehicleIndex}.json'
        saveData(
          folder=folder,
          file=fileName,
          data=result
        )
  except Exception as e:
    logging.error("(processMarcas) - " + str(e))

def processModelos(filenames, dirpath):
  try:
    # Le arquivo Anos e Marcas
    path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarModelos"
    for filename in filenames:
      # filename = q.get()
      with open(dirpath + "/" + filename) as marcaFile: 
        marcas = json.load(marcaFile)
        filename = filename.replace(".json", "").replace("indexes/marcas/", "")
        for marca in marcas:
          codigoTabelaReferencia = filename.split("-")[0]
          codigoTipoVeiculo = filename.split("-")[1]
          codigoMarca = marca['Value']
          data = {
            'codigoTabelaReferencia': codigoTabelaReferencia,
            'codigoTipoVeiculo': codigoTipoVeiculo,
            'codigoMarca': codigoMarca
          }
          result = requestData(
            path=path,
            data=data
          )
          # write marcas onto folder
          folder = "indexes/modelos"
          fileName = f'{codigoTabelaReferencia}-{codigoMarca}-{codigoTipoVeiculo}.json'
          saveData(
            folder=folder,
            file=fileName,
            data=result
          )
  except Exception as e:
    logging.error("(processModelos) - " + str(e))

def processModelosAnos(filenames, dirpath):
  try:
    # Le arquivo Anos e Marcas
    path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarAnoModelo"
    for filename in filenames:
      # filename = q.get()
      with open(dirpath + "/" + filename) as modeloFile: 
        modelos = json.load(modeloFile)["Modelos"]
        filename = filename.replace(".json", "").replace("indexes/modelos/", "")
        for modelo in modelos:
          codigoTabelaReferencia = filename.split("-")[0]
          codigoMarca = filename.split("-")[1]
          codigoTipoVeiculo = filename.split("-")[2]
          codigoModelo = str(modelo["Value"])
          data = {
            'codigoTabelaReferencia': codigoTabelaReferencia,
            'codigoTipoVeiculo': codigoTipoVeiculo,
            'codigoMarca': codigoMarca,
            'codigoModelo': codigoModelo
          }
          result = requestData(
            path=path,
            data=data
          )
          # write marcas onto folder
          folder = "indexes/modelo"
          fileName = f'{codigoTabelaReferencia}-{codigoMarca}-{codigoModelo}-{codigoTipoVeiculo}.json'
          saveData(
            folder=folder,
            file=fileName,
            data=result
          )
  except Exception as e:
   logging.error("(processModelo) - " + str(e))

def processPrice(filenames, dirpath):
  try:
    # Le arquivo Anos e Marcas
    path = "https://veiculos.fipe.org.br/api/veiculos/ConsultarValorComTodosParametros"
    for filename in filenames:
      with open(dirpath + "/" + filename) as versaoFile: 
        versoes = json.load(versaoFile)
        filename = filename.replace(".json", "").replace("indexes/modelo/", "")
        for versao in versoes:
          codigoTabelaReferencia = filename.split("-")[0]
          codigoMarca = filename.split("-")[1]
          codigoModelo = filename.split("-")[2]
          codigoTipoVeiculo = filename.split("-")[3]
          codigoTipoCombustivel = versao['Value'].split("-")[1]
          anoModelo = versao['Value'].split("-")[0]
          data = {
            "codigoMarca": codigoMarca,
            "codigoModelo": codigoModelo,
            "codigoTabelaReferencia": codigoTabelaReferencia,
            "codigoTipoCombustivel": codigoTipoCombustivel,
            "codigoTipoVeiculo": codigoTipoVeiculo,
            "anoModelo": anoModelo,
            "tipoConsulta": "tradicional"
          }
          result = requestData(
            path=path,
            data=data
          )
          # write marcas onto folder
          folder = "indexes/price"
          fileName = f'{codigoTabelaReferencia}-{codigoMarca}-{codigoModelo}-{codigoTipoCombustivel}-{anoModelo}-{codigoTipoVeiculo}.json'
          saveData(
            folder=folder,
            file=fileName,
            data=result
          )
  except Exception as e:
   logging.error("(processPrice) - " + str(e))

########################################

def startMeses():
  processMeses()

def startMarcas():
  vehicles = [1, 2, 3]
  threads = []
  for vehicle in vehicles:
    threads.append(threading.Thread(target=processMarcas, args=(vehicle,)))
  for t in threads:
    t.start()
  for t in threads:
    t.join()

def startModelos():
  for(dirpath, dirnames, filenames) in walk("indexes/marcas"):
    numberOfInstances = 3
    instances = math.ceil(len(filenames) / numberOfInstances)
    newData = [filenames[:instances], filenames[instances:instances*2], filenames[instances*2:]]
    count = 0
    threads = []
    while(count < len(newData)):
      threads.append(threading.Thread(target=processModelos, args=(newData[count], dirpath)))
      count = count + 1
    for t in threads:
      t.start()
    for t in threads:
      t.join()

def startModelosAnos():
  for(dirpath, dirnames, filenames) in walk("indexes/modelos"):
    numberOfInstances = 3
    instances = math.ceil(len(filenames) / numberOfInstances)
    newData = [filenames[:instances], filenames[instances:instances*2], filenames[instances*2:]]
    count = 0
    threads = []
    while(count < len(newData)):
      threads.append(threading.Thread(target=processModelosAnos, args=(newData[count], dirpath)))
      count = count + 1
    for t in threads:
      t.start()
    for t in threads:
      t.join()

def startPrice():
  for(dirpath, dirnames, filenames) in walk("indexes/modelo"):
    numberOfInstances = 3
    instances = math.ceil(len(filenames) / numberOfInstances)
    newData = [filenames[:instances], filenames[instances:instances*2], filenames[instances*2:]]
    count = 0
    threads = []
    while(count < len(newData)):
      threads.append(threading.Thread(target=processPrice, args=(newData[count], dirpath)))
      count = count + 1
    for t in threads:
      t.start()
    for t in threads:
      t.join()

if __name__ == "__main__":
  try:
    # startMeses()
    # startMarcas()
    # startModelos()
    # startModelosAnos()
    startPrice()
  except Exception as e:
    logging.error(e)
