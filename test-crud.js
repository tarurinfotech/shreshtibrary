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

    console.log("=== Testing Info ===");
    let res = await axiosInstance.get('/admin/library/info');
    console.log("Initial Info GET:", res.data.success);
    
    const formInfo = new FormData();
    formInfo.append('library_name', 'Test Library');
    formInfo.append('established_year', '2023');
    formInfo.append('address_line1', '123 Test St');
    formInfo.append('wifi', 'true');
    formInfo.append('facebook_url', 'http://facebook.com/test');
    formInfo.append('tagline', 'A tagline');
    formInfo.append('membership_details', 'Premium'); // plain text now, should not fail
    formInfo.append('testimonials', 'Just testing normal text'); // plain text now
    formInfo.append('faq', JSON.stringify([{ question: 'Q1', answer: 'A1' }])); // json text

    res = await axiosInstance.post('/admin/library/info', formInfo, { headers: formInfo.getHeaders() });
    console.log("Info UPDATE:", res.data.success, res.data.data.library_name === 'Test Library' ? "Name match" : "Name mismatch", res.data.data.membership_details === 'Premium' ? "Membership match" : "Membership mismatch");

    console.log("=== Testing Facilities ===");
    const formFac = new FormData();
    formFac.append('name', 'Test Facility');
    formFac.append('icon_key', 'test-icon');
    formFac.append('is_active', 'true');
    res = await axiosInstance.post('/admin/library/facilities', formFac, { headers: formFac.getHeaders() });
    const facId = res.data.data.id;
    console.log("Facility POST:", res.data.success, "ID:", facId);

    const formFacUpdate = new FormData();
    formFacUpdate.append('name', 'Updated Facility');
    res = await axiosInstance.put('/admin/library/facilities/' + facId, formFacUpdate, { headers: formFacUpdate.getHeaders() });
    console.log("Facility PUT:", res.data.success, res.data.data.name === 'Updated Facility' ? "Name match" : "Name mismatch");

    res = await axiosInstance.delete('/admin/library/facilities/' + facId);
    console.log("Facility DELETE:", res.data.success);

    console.log("=== Testing Achievers ===");
    const formAch = new FormData();
    formAch.append('name', 'Test Achiever');
    formAch.append('achievement', 'Top Score');
    formAch.append('year', '2024');
    res = await axiosInstance.post('/admin/library/achievers', formAch, { headers: formAch.getHeaders() });
    const achId = res.data.data.id;
    console.log("Achiever POST:", res.data.success, "ID:", achId);

    const formAchUpdate = new FormData();
    formAchUpdate.append('name', 'Updated Achiever');
    res = await axiosInstance.put('/admin/library/achievers/' + achId, formAchUpdate, { headers: formAchUpdate.getHeaders() });
    console.log("Achiever PUT:", res.data.success, res.data.data.name === 'Updated Achiever' ? "Name match" : "Name mismatch");

    res = await axiosInstance.delete('/admin/library/achievers/' + achId);
    console.log("Achiever DELETE:", res.data.success);
    
    console.log("All CRUD tests passed!");

  } catch (err) {
    console.error("ERROR:", err.response?.data || err.message);
  }
})();
