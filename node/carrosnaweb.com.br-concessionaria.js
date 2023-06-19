import cheerio from "cheerio";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const folderAddress =
  "../../../rhamses/Documents/us.sitesucker.mac.sitesucker/www.carrosnaweb.com.br";

const folder = path.resolve(folderAddress);

async function init() {
  const files = readdirSync(folder).filter(
    (item) =>
      item.includes("concessionariasdetalhe.asp") &&
      item.includes("tipo=1") &&
      !item.includes("janelas")
  );
  for (let file of files) {
    file = path.resolve(folderAddress + "/" + file);
    const fileResult = readFileSync("./node/concessionarias.json");
    const fileName = readFileSync(file, { encoding: "binary" }).toString();
    const $ = cheerio.load(fileName);
    const concessionaria = $("table[width='1250']")
      .eq(1)
      .children("tbody")
      .children("tr")
      .eq(1)
      .children("td")
      .children("font")
      .html()
      .match(/(Concessionária.+)/gim)[0]
      .replace("Concessionária", "")
      .trim();
    const address1 = $("table:nth-child(1) tr:nth-child(1) td:nth-child(1)")
      .text()
      .replace("Topo", "")
      .replace(/\n|\t/gim, "")
      .trim();
    const address2 = $("table:nth-child(1) tr:nth-child(2) td:nth-child(1)")
      .text()
      .trim();
    const address3 = $("table:nth-child(1) tr:nth-child(3) td:nth-child(1)")
      .text()
      .trim();
    const address4 = $("table:nth-child(1) tr:nth-child(4) td:nth-child(1)")
      .text()
      .trim();
    const street =
      address1 +
      ", " +
      address2.split(/([0-9].+)/gm)[0].trim() +
      ", " +
      address3.split(/[A-Z]{2}/gm)[0].trim();
    const state = address3.substring(address3.length - 2);
    const cep = address2.substring(address2.length - 9);
    const phone =
      "(" +
      address4.replace("Telefone:", "").trim()[0] +
      address4.replace("Telefone:", "").trim()[1] +
      ")" +
      address4.replace("Telefone:", "").trim().substring(3);
    const fullAddress = [
      {
        concessionaria,
        address: street,
        state,
        cep,
        phone,
      },
    ];
    let result;
    if (fileResult.toString().length > 0) {
      const resultItems = JSON.parse(fileResult.toString());
      resultItems.push(fullAddress[0]);
      result = resultItems;
    } else {
      result = fullAddress;
    }
    writeFileSync("./node/concessionarias.json", JSON.stringify(result), {
      flag: "w",
    });
  }
}
init();
