const axios = require('axios');

async function run() {
  const email = 'candidate' + Date.now() + '@test.com';
  try {
    // 1. Register candidate
    console.log("Registering candidate...");
    await axios.post('http://localhost:5206/api/auth/register', {
      firstName: 'John',
      lastName: 'Doe',
      email: email,
      password: 'Password@123',
      role: 'Candidate'
    });
    
    // In our backend, email is verified? Or maybe we need OTP?
    // Let's just login
    console.log("Logging in...");
    const res = await axios.post('http://localhost:5206/api/auth/login', {
      email: email,
      password: 'Password@123'
    });
    
    const token = res.data.token;
    console.log("Token received.");
    
    const endpoints = [
      '/candidates/profile',
      '/jobapplications/candidate',
      '/jobs/recommendations'
    ];
    
    for (const ep of endpoints) {
      try {
        const r = await axios.get('http://localhost:5206/api' + ep, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`[GET ${ep}] -> ${r.status}`);
      } catch (e) {
        if (e.response) {
          console.log(`[GET ${ep}] -> ERROR ${e.response.status} ${JSON.stringify(e.response.data)}`);
        } else {
          console.log(`[GET ${ep}] -> ERROR ${e.message}`);
        }
      }
    }
  } catch (e) {
    if (e.response) {
      console.log("Error status:", e.response.status, e.response.data);
    } else {
      console.log("Error:", e.message);
    }
  }
}
run();
