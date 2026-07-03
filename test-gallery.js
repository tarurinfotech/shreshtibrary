const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const loginRes = await axios.post('http://localhost:5247/api/v1/auth/login/admin', { username: 'vipultarur', password: 'Admin123' });
    const token = loginRes.data.data.tokens.access;
    const axiosInstance = axios.create({
      baseURL: 'http://localhost:5247/api/v1',
      headers: { Authorization: 'Bearer ' + token }
    });

    console.log('=== Testing Gallery ===');
    // GET gallery
    let res = await axiosInstance.get('/admin/library/gallery');
    console.log('Gallery GET:', res.data.success, 'Count:', res.data.data.length);

    // POST gallery - create a tiny 1x1 PNG as test file
    const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const formGallery = new FormData();
    formGallery.append('image', pngBytes, { filename: 'test.png', contentType: 'image/png' });
    formGallery.append('caption', 'Test Caption');

    res = await axiosInstance.post('/admin/library/gallery', formGallery, { headers: formGallery.getHeaders() });
    console.log('Gallery POST:', res.data.success, 'ID:', res.data.data.id);
    const galleryId = res.data.data.id;

    // DELETE gallery
    res = await axiosInstance.delete('/admin/library/gallery/' + galleryId);
    console.log('Gallery DELETE:', res.data.success);

    console.log('=== Testing Reviews ===');
    res = await axiosInstance.get('/admin/library/reviews');
    console.log('Reviews GET:', res.data.success, 'Count:', res.data.data.length);

    res = await axiosInstance.get('/admin/library/reviews/summary');
    console.log('Review Summary GET:', res.data.success);

    console.log('All gallery/review tests passed!');
  } catch (err) {
    console.error('ERROR:', err.response?.data || err.message);
  }
})();
