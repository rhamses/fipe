<template>
  <main>
    <Header />
    <section id="heroSearch" class="dark:bg-cyan-300 min-h-screen py-10 md:flex md:items-center">
      <div class="h-full md:flex container mx-auto">
        <div class="px-10 z-10 relative flex basis-1/2 md:items-center">
          <div>
            <h1 class="text-3xl/tight sm:text-4xl/tight md:text-5xl/tight xl:text-6xl/tight font-bold text-heading-1"
              style="text-shadow: 2px 2px 2px white">
              Tabela Fipe
            </h1>
            <p class="my-5">
              Encontre os valores do seu veículo. Preencha o campo abaixo com o nome do modelo e em seguida selecione o
              ano para ver o histórico de valores. Em seguida nos ajude a construir um serviço cada vez melhor
              contribuindo com o seu email para receber novidades
            </p>
            <form class="relative">
              <label for="default-search"
                class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
              <div class="md:flex z-10">
                <div class="relative basis-full">
                  <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                      <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                    </svg>
                  </div>
                  <input autocomplete="off" @input="doSearch" @focus="resetVariables"
                    placeholder="Pesquise pelo modelo do carro: C3 1.5 exclusive" v-model="searchModel" type="search"
                    id="default-search"
                    class="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                    required>
                </div>
                <div v-if="modelVariations.length > 0" class="relative mt-5 md:mt-0 md:ml-5">
                  <Icon name="material-symbols:calendar-month-outline" size="1.2em" color="gray"
                    class="absolute left-2 top-4 " />
                  <select v-model="variationModel"
                    class="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                    <option value="" selected>Escolha um ano</option>
                    <option v-for="item in modelVariations" :value="item._id">{{ item.ano }}</option>
                  </select>
                </div>
              </div>
              <ul v-if="searchItems"
                class="absolute bg-white max-h-64 overflow-y-scroll dark:bg-gray-100 rounded-b-lg -mt-2 drop-shadow-xl w-full">
                <li v-for="item in searchItems">
                  <button @click="selectItem(item)" type="button" class="flex p-5 border-b border-solid w-full">
                    🚗
                    <p class="pl-2 uppercase">
                      {{ item.marca_name }} {{ item.modelo_name }}
                    </p>
                  </button>
                </li>
              </ul>
            </form>
          </div>
        </div>
        <div class="basis-1/2 relative z-0">
          <img class="absolute"
            src="data:image/svg+xml;base64,77u/PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAyMDAwIDE4MDAnIGZpbGw9JyNCREQ3NDcnPjxwYXRoIGQ9J00xMzg2LjU3IDE4MS40YzE2MC45IDczLjc0IDMyOC41IDE0OS43MiA0MjQuNTkgMjgxLjU3IDk2LjA5IDEyOS42MSAxMTguNDQgMzE1LjA5IDk4LjMzIDQ4Ny4xNi0yMC4xMSAxNzIuMDctODQuOTIgMzMyLjk3LTE4Ny43MSA0NDYuOTQtMTA1LjAzIDExNi4yLTI1MC4yOSAxODUuNDgtMzkxLjA3IDI0My41OC0xMzguNTUgNjAuMzQtMjcyLjYzIDEwOS41LTM5My4zMSA5MS42Mi0xMjIuOTEtMTcuODgtMjM0LjY0LTEwMi44LTM3Ny42Ni0xNjAuOS0xNDMuMDItNTguMS0zMTcuMzMtODcuMTUtNDA2LjcxLTE4My4yNC04OS4zOS05Ni4wOS05Ni4wOS0yNjEuNDYgMi4yMy0zNjguNzIgOTguMzMtMTA5LjUgMzAxLjY4LTE2MC45IDM4NC4zNy0yNzAuNCA4Mi42OC0xMTEuNzMgNDIuNDYtMjgzLjgxIDg0LjkyLTQyMi4zNkM2NjkuMjQgMTg4LjEgNzk4Ljg2IDgwLjgzIDkzNy40MSA2MC43MmMxNDAuNzktMjAuMTEgMjkwLjUxIDQ5LjE2IDQ0OS4xNyAxMjAuNjdaJz48L3BhdGg+PC9zdmc+"
            alt="" style="z-index: 1">
          <div class="h-full flex items-center justify-center z-10 relative">
            <div>
              <client-only>
                <Vue3Lottie
                  animationLink="https://assets-v2.lottiefiles.com/a/a3f16eb6-1176-11ee-91a6-4b5c993f7e76/uwt51wP1FH.json"
                  class="px-10 md:px-20 z-0" />
              </client-only>
              <p v-for="item in lastUpdated" class="text-center">
                Última Atualização: {{ filterDate(item.reference) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section v-if="priceModel.length > 0" id="detailsPrice" class="flex bg-gray-200 px-10">
      <div class="container mx-auto pt-10">
        <h2 class="
        font-bold
        sm:text-xl/tight
        ">
          Histórico de Preço
        </h2>
        <div id="highlightPrice" class="md:flex md:items-center">
          <div class="py-10 text-center">
            <h3 class="font-bold mb-10 
            text-2xl
            md:text-4xl">
              {{ searchModel }} -
              {{ variationYear }}
            </h3>
            <img :src="'/logos/' + marcaModel + '.svg'" alt="" class="mx-auto h-20">
          </div>
          <div id="currentPrice" class="basis-full">
            <Card :item="priceHighlight" :variation="percentageModel" cssClass="mx-auto" />
          </div>
        </div>
        <div id="yearPrices" class="flex justify-between flex-wrap my-10">
          <template v-for="price in priceModel">
            <Card :item="price" cssClass="mb-5 basis-full md:basis-auto" />
          </template>
        </div>
      </div>
    </section>
    <section id="leads">
      <div class="container mx-auto text-center p-10 max-w-xl flex flex-col justify-between h-96 md:h-80">
        <h2 class="
        text-3xl/tight
        sm:text-4xl/tight
        font-bold
        text-heading-1">Fique por dentro!</h2>
        <p>Se você é desenvolvedor ou uma loja que gostaria de inserir esses dados em suas plataformas, preencha o
          formulário abaixo:</p>
        <form v-if="!formModel" action="" @submit.prevent="sendLead">
          <input v-model="emailModel" required type="email" name="email" id="email" placeholder="email@provedor.com"
            class="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
          <button
            class="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 border-b-4 border-blue-700 hover:border-blue-500 rounded mt-5">
            Quero receber novidades
          </button>
        </form>
        <div v-else>
          <h2 class="
            text-3xl/tight
            sm:text-4xl/tight
            font-bold
            text-heading-1">Obrigado. Em breve você receberá novidades</h2>
        </div>
      </div>
    </section>
  </main>
</template>

<style>
select {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}
</style>

<script setup>
import { Vue3Lottie } from 'vue3-lottie'
import { App } from "realm-web";
import DataApi from "./services/dataAPI"
const key = "34P7fmMNocx74WCrayy8KgUvRhZSKjg5JtYpI5PyjfRDzCR7j4Zbw7B1kRAFX32q"
const realm = new App({ id: "data-dtyre" })
const credentials = App.Credentials.apiKey(key)
const { _accessToken, _refreshToken } = await realm.logIn(credentials)
// ENV VARIABLES
const dataApiParams = {
  url: "https://sa-east-1.aws.data.mongodb-api.com/app/data-dtyre/endpoint/data/v1/action",
  dataSource: "Cluster0",
  database: "fipe",
  token: _accessToken
}
// CARGO 3133 E 6x4 Turbo 2p (diesel)(E5)
const searchItems = ref([])
const searchModel = ref("")
const marcaModel = ref("")
const priceModel = ref("")
const priceHighlight = ref("")
const emailModel = ref("")
const formModel = ref(false)
const percentageModel = ref("")
const variationModel = ref("")
const modelVariations = ref([])
const lastUpdated = ref("")
const variationYear = computed(() => {
  if (modelVariations.value.length > 0 && variationModel.value.length > 0) {
    return modelVariations.value.find(item => item._id === variationModel.value).ano
  }
})

watch(variationModel, async (value) => {
  if (value) {
    doPrice(value)
    doPercentage(value)
  }
})

watch(percentageModel, (value) => {
  if (value) {
    window.scroll({
      top: document.querySelector("#leads").offsetTop - 300,
      left: 0,
      behavior: 'smooth'
    });
  }
})

watch(priceModel, (value) => {
  if (value) {
    const highlight = value.shift()
    priceHighlight.value = highlight
  }
})

mongoLastUpdate()

function selectItem(item) {
  searchModel.value = item.marca_name + " " + item.modelo_name
  searchItems.value = []
  marcaModel.value = item.marca_id
  doVariacoes(item.modelo_id)
}

function resetVariables() {
  searchItems.value = []
  searchModel.value = ""
  marcaModel.value = ""
  priceModel.value = ""
  priceHighlight.value = ""
  emailModel.value = ""
  formModel.value = false
  percentageModel.value = ""
  variationModel.value = ""
  modelVariations.value = []
  lastUpdated.value = ""
}

async function doVariacoes(modelID) {
  const API = new DataApi(dataApiParams);
  API.collection = "variacoes"
  const body = {
    "sort": {
      "ano": 1
    },
    "filter": {
      "modelo_id": {
        "$oid": modelID
      }
    }
  }
  modelVariations.value = await API.find(body)
}

function doSearch(e) {
  setTimeout(async () => {
    const API = new DataApi(dataApiParams);
    if (e.target.value) {
      searchModel.value = e.target.value;
      API.collection = "marcas_modelos"
      searchItems.value = await API.searchModelos(searchModel.value)
    } else {
      resetVariables()
    }
  }, 200)
}

async function sendLead() {
  try {
    const API = new DataApi(dataApiParams);
    const timestamp = new Date().getTime();
    const data = {
      email: emailModel.value,
      created_at: {
        $date: {
          $numberLong: String(timestamp),
        },
      }
    }
    await API.insertOne(data)
    formModel.value = true
  } catch (error) {
    console.log("error", error)
  }
}

async function doPrice(variationId) {
  const API = new DataApi(dataApiParams);
  API.collection = "price_timeseries"
  const body = {
    "sort": {
      "reference": -1
    },
    "filter": {
      "variacao_id": {
        "$oid": variationId
      }
    }
  }
  priceModel.value = await API.find(body)
}

async function doPercentage(variationId) {
  const API = new DataApi(dataApiParams);
  const variacao_id = variationId
  const from = new Date(new Date().getUTCFullYear() + "-" + (new Date().getUTCMonth() - 6) + "-1").getTime()
  const to = new Date().getTime()
  percentageModel.value = await API.percentageValue({ variacao_id, from, to })
}

async function mongoLastUpdate() {
  const API = new DataApi(dataApiParams);
  API.collection = "price_timeseries"
  const body = {
    "sort": {
      "reference": -1
    },
    "limit": 1
  }
  lastUpdated.value = await API.find(body)
}

function filterDate(itemDate) {
  const newItemDate = new Date(itemDate)
  const month = newItemDate.getMonth() + 2
  let monthText = ""
  switch (month) {
    case 1:
      monthText = "Janeiro"
      break;
    case 2:
      monthText = "Fevereiro"
      break;
    case 3:
      monthText = "Março"
      break;
    case 4:
      monthText = "Abril"
      break;
    case 5:
      monthText = "Maio"
      break;
    case 6:
      monthText = "Junho"
      break;
    case 7:
      monthText = "Julho"
      break;
    case 8:
      monthText = "Agosto"
      break;
    case 9:
      monthText = "Setembro"
      break;
    case 10:
      monthText = "Outubro"
      break;
    case 11:
      monthText = "Novembro"
      break;
    case 12:
      monthText = "Dezembro"
      break;
  }
  return `${monthText} de ${newItemDate.getFullYear()}`
}
</script>