from pathlib import Path
from enum import Enum
from typing import Any, Dict, List, Optional
from time import sleep
import requests
import json
import random

class FipeAPI(Enum):
  TipoVeiculo = [1,2,3]
  HostAddress = "veiculos.fipe.org.br"
  TabelaDeReferencia = "/api/veiculos/ConsultarTabelaDeReferencia"
  Marcas = "/api/veiculos/ConsultarMarcas"
  Modelos = "/api/veiculos/ConsultarModelos"
  AnoModelo = "/api/veiculos/ConsultarAnoModelo"
  ValorComTodosParametros = "/api/veiculos/ConsultarValorComTodosParametros"
  ModelosAtravesDoAno = "/api/veiculos/ConsultarModelosAtravesDoAno"
  DATA_DIR = Path("/Volumes/T9/")

DEFAULT_HEADERS: Dict[str, str] = {
  "Content-Type": "application/json",
  "Accept": "application/json",
  "Referer": "https://veiculos.fipe.org.br/",
  "Origin": "https://veiculos.fipe.org.br",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
}

ERRORS = 0

def _call_api(url: str, payload: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None, timeout: int = 10):
  """Send a POST request to the FIPE API and return the JSON response."""
  request_headers = {**DEFAULT_HEADERS, **(headers or {})}
  payload = payload or {}

  try:
    response = requests.post(
      f"https://{FipeAPI.HostAddress.value}{url}",
      json=payload,
      headers=request_headers,
      timeout=timeout,
    )
    response.raise_for_status()
    return response.json()
  except requests.HTTPError as exc:
    print("HTTP error when calling FIPE API", exc.response.status_code, exc.response.text)
    ERRORS =+ 1
  except requests.RequestException as exc:
    print("Request failed when calling FIPE API", str(exc))
    ERRORS =+ 1

def _data_path(filename: str) -> Path:
  return FipeAPI.DATA_DIR.value / "fipe" / "data" / filename


def should_call_api(filename: str, min_bytes: int = 10) -> bool:
  """Return True when the response file is missing or too small to trust."""
  target_path = _data_path(filename)
  return not (target_path.is_file() and target_path.stat().st_size > min_bytes)


def _save_json(filename: str, data):
  target_path = _data_path(filename)
  parent_dir = target_path.parent
  # If a file exists where we expect a directory, remove it so we can create the directory
  if parent_dir.exists() and parent_dir.is_file():
    parent_dir.unlink()
  parent_dir.mkdir(parents=True, exist_ok=True)
  with open(target_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)


def list_files(folder: Path, recursive: bool = False) -> List[Path]:
  """Return all files from `folder`; include subfolders when `recursive` is True."""
  if not folder.exists():
    return []

  iterator = folder.rglob("*") if recursive else folder.iterdir()
  return [
    item for item in sorted(iterator)
    if item.is_file() and not item.name.startswith("._")
  ]


def tabelaReferencia():
  try:
    filename = "mes/mesReferencia.json"
    result = _call_api(FipeAPI.TabelaDeReferencia.value)
    _save_json(filename, result)
    print(filename)
  except Exception as e:
    print('tabelaReferencia', str(e))
    ERRORS =+ 1

def marcas():
  try:
    target_path = FipeAPI.DATA_DIR.value / "fipe" / "data" / "mes/mesReferencia.json"
    with open(target_path, 'r') as meses:
      data = json.load(meses)
      for veiculo in FipeAPI.TipoVeiculo.value:
        for mes in data:
          payload = {
            'codigoTabelaReferencia': mes["Codigo"],
            'codigoTipoVeiculo': veiculo
          }
          filename = f"marcas/{veiculo}_{mes['Codigo']}.json"
          if not should_call_api(filename):
            continue

          result = _call_api(FipeAPI.Marcas.value, payload=payload)
          _save_json(filename, result)
          print(filename)
          sleep(.5)
  except Exception as e:
    print('marcas', str(e))
    ERRORS =+ 1

def modelos():
  try:
    marcas_path = FipeAPI.DATA_DIR.value / "fipe" / "data" / "marcas"
    print(len(list_files(marcas_path)))
    for marca_path in list_files(marcas_path):
      veiculo, referencia = marca_path.stem.split("_", 1)
      with marca_path.open("r") as marca_file:
        for marca in json.load(marca_file):
          payload = {
            "codigoTipoVeiculo": int(veiculo),
            "codigoTabelaReferencia": int(referencia),
            "codigoMarca": marca["Value"],
          }
          filename = f"modelos/{veiculo}_{referencia}_{marca['Value']}.json"
          if not should_call_api(filename):
            continue

          result = _call_api(FipeAPI.Modelos.value, payload=payload)
          _save_json(filename, result)
          print(filename)
          sleep_duration = random.uniform(0.5, 1.5)
          sleep(sleep_duration)
  except Exception as e:
    print('modelos', str(e))
    ERRORS =+ 1

def modelosAnos():
  try:
    modelos_path = FipeAPI.DATA_DIR.value / "fipe" / "data" / "modelos"
    for modelo_path in list_files(modelos_path):
      veiculo, referencia, marca = modelo_path.stem.split("_", 2)
      with modelo_path.open("r") as modelo_file:
        modelo_dict = json.load(modelo_file)
        if "Modelos" in modelo_dict and len(modelo_dict.get("Modelos")) > 0:
          for modelo in modelo_dict.get("Modelos"):
            payload = {
              "codigoTipoVeiculo": int(veiculo),
              "codigoTabelaReferencia": int(referencia),
              "codigoMarca": int(marca),
              'codigoModelo': int(modelo.get("Value"))
            }
            filename = f"modelos_ano/{veiculo}_{referencia}_{marca}_{modelo.get('Value')}.json"
            if not should_call_api(filename):
              continue

            result = _call_api(FipeAPI.AnoModelo.value, payload=payload)
            _save_json(filename, result)
            print(filename)
            sleep_duration = random.uniform(0.5, 1.5)
            sleep(sleep_duration)
  except Exception as e:
    print('modelos anos', str(e))
    ERRORS =+ 1
    
def precoFinal():
  log = ""
  try:
    modelos_ano_path = FipeAPI.DATA_DIR.value / "fipe" / "data" / "modelos_ano"
    for modelo_ano_path in list_files(modelos_ano_path):
      veiculo, referencia, marca, modelo = modelo_ano_path.stem.split("_", 3)
      log = modelo_ano_path
      with modelo_ano_path.open("r") as modelo_ano_file:
        modelo_ano_dict = json.load(modelo_ano_file)
        for modelo_ano in modelo_ano_dict:
          ano = modelo_ano["Value"].split("-")[0]
          fuel = modelo_ano["Value"].split("-")[1]
          payload = {
            "codigoTipoVeiculo": int(veiculo),
            "codigoTabelaReferencia": int(referencia),
            "codigoMarca": int(marca),
            'codigoModelo': int(modelo),
            'codigoTipoCombustivel': fuel,
            'anoModelo': ano,
            'tipoConsulta': 'tradicional'
          }
          filename = f"preco/{veiculo}_{referencia}_{marca}_{modelo}_{ano}_{fuel}.json"
          if not should_call_api(filename):
            continue

          result = _call_api(FipeAPI.ValorComTodosParametros.value, payload=payload)
          _save_json(filename, result)
          print(filename)
          sleep_duration = random.uniform(0.5, 1.5)
          sleep(sleep_duration)
  except Exception as e:
    print('preco final', str(e), log)
    ERRORS =+ 1

def start():
  fns = [tabelaReferencia,marcas,modelos,modelosAnos,precoFinal]
  for fn in fns:
    fn()
  return

if __name__ == "__main__":
  start()
  if ERRORS > 0:
    ERRORS = 0
    start()
# 5242