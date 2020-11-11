const fs = require("fs");
const { callService } = require("./client");

async function encode(vc, { outfile, ...credentials }) {
  const vcStrIn = fs.readFileSync(vc);
  const vcJson = JSON.parse(vcStrIn);
  const payload = JSON.stringify(vcJson);
  // console.log("LEN", payload.length);

  const request = {
    payload: payload,
    as_chunks: true,
    options: {
      // code_quantity: 4,
      bytes_per_code: 4000
    }
  };

  try {
    const response = await callService(
      "/qrcodes/v1/create",
      request,
      credentials
    );

    const imgDataBase64 = response.qrcode.canvas.replace(
      "data:image/png;base64,",
      ""
    );
    const imgDataBuff = Buffer.from(imgDataBase64, "base64");
    fs.writeFileSync(outfile, imgDataBuff);
  } catch (err) {
    throw err;
  }
}

module.exports = { encode };
