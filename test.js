const axios = require("axios");

const api = axios.create({
  baseURL: "http://localhost:5247/api/v1",
});

async function run() {
  try {
    const res = await api.get("/admin/inbox/");
    console.log("Raw response data:", JSON.stringify(res.data));
    const data = (res.data && "data" in res.data) ? res.data.data : res.data;
    console.log("Unwrapped data:", JSON.stringify(data));
    console.log("Is array:", Array.isArray(data));
  } catch (e) {
    console.error(e.message);
  }
}

run();
