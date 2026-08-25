const axios = require('axios');

async function run() {
  try {
    const res = await axios.post('http://localhost:5206/api/auth/login', {
      email: 'EduTechAdmin',
      password: 'Sch@123'
    });
    const token = res.data.token;
    console.log("Token received.");
    
    // Decode JWT payload
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    console.log("Payload:", jsonPayload);
    
  } catch (e) {
    if (e.response) {
      console.log("Error status:", e.response.status, e.response.data);
    } else {
      console.log("Error:", e.message);
    }
  }
}
run();
