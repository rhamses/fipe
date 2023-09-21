import os
import logging
import requests
import json
import threading
import math
from datetime import datetime
from os import walk, remove

logFile = "output-utils-" + str(datetime.now()) + ".log"
logging.basicConfig(filename=logFile, encoding="utf-8")
indexesPath = "indexes"
VARIACAO_PATH = "data/indexes/variacao/"
MODELO_PATH = "data/indexes/modelos/"
BRANDS_PATH = "data/indexes/marcas/"
PRICE_PATH = "data/indexes/price/"
MONTHS_PATH = "data/indexes/meses.json"
LIMIT = 76


def removeNoJson(path):
    for dirpath, dirnames, filenames in walk(path):
        for filename in filenames:
            if ".json" not in filename:
                remove(dirpath + filename)
            elif ".json.json" in filename:
                remove(dirpath + filename)


def removeFileFalse(path):
    for dirpath, dirnames, filenames in walk(path):
        for filename in filenames:
            theFile = json.load(open(dirpath + filename))
            if theFile is False:
                remove(dirpath + filename)


def removeMalFormed(path, limit):
    for dirpath, dirnames, filenames in walk(path):
        for filename in filenames:
            theFile = filename.split("-")
            if len(theFile) != limit:
                remove(dirpath + filename)


def removeFileBySize(path, limit):
    for dirpath, dirnames, filenames in walk(path):
        for filename in filenames:
            file_stats = os.stat(dirpath + "/" + filename)
            if file_stats.st_size < limit:
                remove(dirpath + filename)


if __name__ == "__main__":
    try:
        # removeNoJson(PRICE_PATH)
        # removeFileFalse(MODELO_PATH)
        # removeMalFormed(PRICE_PATH, 6)
        # removeMalFormed(VARIACAO_PATH, 6)
        removeFileBySize(VARIACAO_PATH, 76)
    except Exception as e:
        logging.error(e)
