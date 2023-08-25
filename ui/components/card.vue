<template>
  <div class="max-w-sm bg-white rounded overflow-hidden shadow-lg" :class="cssClass">
    <div class="px-6 py-4">
      <div class="font-bold text-md mb-2">
        {{ month }} de {{ year }}
      </div>
      <p class="font-bold text-2xl text-gray-700 mb-2">
        R$ {{ money }}
      </p>
      <p v-if="variation">
        <span v-if="variation[0].yearly < 0"> Desvalorização no ano </span>
        <span v-else> Valorização no ano </span>
        <br>
        <b class="font-bold text-xl"
          :class="{ 'text-red-500': variation[0].yearly < 0, 'text-green-500': variation[0].yearly > 0 }">
          {{ variation[0].yearly < 0 ? variation[0].yearly * -1 : variation[0].yearly }} % </b>
      </p>
    </div>
    <!-- <div class="px-6 pt-4 pb-2">
      <span
        class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">#photography</span>
      <span
        class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">#travel</span>
      <span
        class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">#winter</span>
    </div> -->
  </div>
</template>

<script setup>
import Months from "../services/months"
const { title, item, variation, cssClass } = defineProps(["title", "item", "variation", "cssClass"])
const { price, reference } = item
const money = ref("")
const month = ref("")
const year = ref("")
money.value = filterMoney()
month.value = filterMonth()
year.value = new Date(reference).getFullYear()

function filterMonth() {
  return Months[new Date(reference).getUTCMonth() + 1]
}

function filterMoney() {
  const money = String(price)
  return money.substr(0, money.length - 3) + "." + money.substr(-3) + ",00"
}
</script>