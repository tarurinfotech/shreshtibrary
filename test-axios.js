const axios = require('axios');
(async () => {
  const loginRes = await axios.post('http://localhost:5247/api/v1/auth/login/admin', { username: 'vipultarur', password: 'Admin123' });
  const token = loginRes.data.data.tokens.access;
  
  const res = await axios.get('http://localhost:5247/api/v1/admin/library/info', {
    headers: { Authorization: 'Bearer ' + token }
  });
  
  const responseData = res.data;
  console.log("Response data:", responseData);
  const data = (responseData && "data" in responseData) ? responseData.data : responseData;
  console.log("Unwrapped data:", data);
})();
