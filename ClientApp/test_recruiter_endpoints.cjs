const axios = require('axios');

async function run() {
  try {
    const res = await axios.post('http://localhost:5206/api/auth/login', {
      email: 'recav1@edu.net',
      password: 'Sch@123'
    });
    const token = res.data.token;
    console.log("Token received.");
    
    const endpoints = [
      '/recruiter/credits',
      '/recruiter/credits/transactions',
      '/jobs/recruiter',
      '/jobapplications/interviews'
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
      console.log("Login Error status:", e.response.status, e.response.data);
    } else {
      console.log("Login Error:", e.message);
    }
  }
}
run();
