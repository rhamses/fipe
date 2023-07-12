const fs = require("fs");
const path = require("path");
const folderPath = "/Users/rhamses/Sites/fipe/data/2022";
const folders = fs.readdirSync(path.resolve(folderPath));

const fuel = new Set();

for (const f of folders) {
  if (f[0] != ".") {
    // marcas
    const l2Files = fs.readdirSync(
      path.resolve(path.resolve(folderPath + "/" + f))
    );
    for (const f1 of l2Files) {
      if (f1[0] != "." && !f1.includes(".json")) {
        // modelos
        const l3Files = fs.readdirSync(
          path.resolve(path.resolve(folderPath + "/" + f + "/" + f1))
        );
        for (const f2 of l3Files) {
          if (f2[0] != "." && !f2.includes(".json")) {
            // modelos anos
            const l4Files = fs.readdirSync(
              path.resolve(
                path.resolve(folderPath + "/" + f + "/" + f1 + "/" + f2)
              )
            );
            for (const f3 of l4Files) {
              if (f3[0] != "." && !f3.includes(".json")) {
                // anos
                if (f3[0] != "." && !f3.includes(".json")) {
                  const l5Files = fs.readdirSync(
                    path.resolve(
                      path.resolve(
                        folderPath + "/" + f + "/" + f1 + "/" + f2 + "/" + f3
                      )
                    )
                  );
                  for (const f5 of l5Files) {
                    if (f5[0] != "." && !f5.includes(".json")) {
                      fuel.add(f5);
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

console.log(fuel.entries());
