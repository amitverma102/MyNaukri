const axios = require('axios');

async function run() {
  try {
    const res = await axios.post('http://localhost:5206/api/auth/login', {
      email: 'EduTechAdmin',
      password: 'Sch@123'
    });
    const token = res.data.token;
    console.log("Token received.");
    
    const res2 = await axios.get('http://localhost:5206/api/superadmin/dashboard-stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Stats status:", res2.status);
    console.log("Stats data:", res2.data);
    
  } catch (e) {
    if (e.response) {
      console.log("Error status:", e.response.status, e.response.data);
    } else {
      console.log("Error:", e.message);
    }
  }
}
run();
