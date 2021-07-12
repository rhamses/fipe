const https = require('https');
const FormData = require('form-data');

module.exports = async (body, url) => {
  try {

    return new Promise((resolve, reject) => {

      const FormDataBody = new FormData();

      if(body && Object.entries(body).length > 0) {
        for(item of Object.entries(body)) {
          FormDataBody.append(item[0], item[1]);
        }
      }

      
      const options = {
        'method': 'POST',
        'hostname': 'veiculos.fipe.org.br',
        'path': `/api/veiculos/${url}`,
        'headers': { 
          'Cookie': 'ROUTEID=.3',
          ...FormDataBody.getHeaders()
        },
        'maxRedirects': 20
      };

      const req = https.request(options, function (res) {
        const chunks = [];

        res.on("data", function (chunk) {
          chunks.push(chunk);
        });

        res.on("end", function (chunk) {
          const body = Buffer.concat(chunks);
          resolve(JSON.parse(body));
        });

        res.on("error", function (error) {
          console.error(error);
          reject(error)
        });
      });

      FormDataBody.pipe(req);

      req.end();
    })
  } catch(e) {
    console.log(e)
  }
}