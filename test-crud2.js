const axios = require('axios');
const FormData = require('form-data');

(async () => {
  try {
    const loginRes = await axios.post('http://localhost:5247/api/v1/auth/login/admin', { username: 'vipultarur', password: 'Admin123' });
    const token = loginRes.data.data.tokens.access;
    const axiosInstance = axios.create({
      baseURL: 'http://localhost:5247/api/v1',
      headers: { Authorization: 'Bearer ' + token }
    });

    const formInfo = new FormData();
    formInfo.append('membership_details', '"Premium"'); // valid json string
    formInfo.append('testimonials', '[]'); // valid json array
    formInfo.append('faq', JSON.stringify([{ question: 'Q1', answer: 'A1' }]));

    const res = await axiosInstance.post('/admin/library/info', formInfo, { headers: formInfo.getHeaders() });
    console.log("Info UPDATE:", res.data.success);

  } catch (err) {
    console.error("ERROR:", err.response?.data || err.message);
  }
})();
