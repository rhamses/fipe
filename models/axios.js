const https = require('https');
const axios = require('axios');
const FormData = require('form-data');
const FormDataBody = new FormData();

const newAxios = axios.create({
  httpsAgent: new https.Agent({keepAlive: true}),
  baseURL: 'https://veiculos.fipe.org.br/api/veiculos',
  timeout: 60000
})

module.exports = async (body, url) => {
  try {
    if(body && Object.entries(body).length > 0) {
      for(item of Object.entries(body)) {
        FormDataBody.append(item[0], item[1]);
      }
    }
    const config = {
      method: 'post',
      url: url,
      data: FormDataBody,
      'Cookie': 'ROUTEID=.3',
      headers: { 
        ...FormDataBody.getHeaders()
      },
    }

    return newAxios(config).then(res => res.data).catch(e => console.log(e));

  } catch(e) {
    console.log(e)
  }
}