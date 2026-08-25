const axios = require('axios');

async function run() {
  try {
    const res = await axios.post('http://localhost:5206/api/auth/login', {
      email: 'recav1@edu.net',
      password: 'Sch@123'
    });
    const token = res.data.token;
    console.log("Token received.");
    
    const protectedRes = await axios.get('http://localhost:5206/api/jobs/recruiter', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Protected endpoint status:", protectedRes.status);
  } catch (e) {
    if (e.response) {
      console.log("Error status:", e.response.status, e.response.data);
    } else {
      console.log("Error:", e.message);
    }
  }
}
run();
