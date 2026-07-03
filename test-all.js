const axios = require('axios');
(async () => {
  try {
    const loginRes = await axios.post('http://localhost:5247/api/v1/auth/login/admin', { username: 'vipultarur', password: 'Admin123' });
    const token = loginRes.data.data.tokens.access;
    const opts = { headers: { Authorization: 'Bearer ' + token } };
    
    console.log("Fetching all...");
    await axios.get('http://localhost:5247/api/v1/admin/library/info', opts);
    console.log("info OK");
    await axios.get('http://localhost:5247/api/v1/admin/library/facilities', opts);
    console.log("facilities OK");
    await axios.get('http://localhost:5247/api/v1/admin/library/achievers', opts);
    console.log("achievers OK");
    await axios.get('http://localhost:5247/api/v1/admin/library/reviews', opts);
    console.log("reviews OK");
    await axios.get('http://localhost:5247/api/v1/admin/library/reviews/summary', opts);
    console.log("reviewSummary OK");
    await axios.get('http://localhost:5247/api/v1/admin/library/gallery', opts);
    console.log("gallery OK");
  } catch (err) {
    console.error("ERROR in one of the requests:", err.message, err.response?.data);
  }
})();
