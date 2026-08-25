const axios = require('axios');

async function run() {
  const email = 'candidate_' + Date.now() + '@test.com';
  try {
    console.log("Registering...", email);
    await axios.post('http://localhost:5206/api/auth/register', {
      firstName: 'Jane',
      lastName: 'Doe',
      email: email,
      password: 'Password@123',
      role: 'Candidate'
    });
    
    // Attempt to login right away (will fail if not verified, but let's see)
    try {
      const loginRes = await axios.post('http://localhost:5206/api/auth/login', {
        email: email,
        password: 'Password@123'
      });
      console.log("Logged in right away?", !!loginRes.data.token);
    } catch(e) {
      if (e.response && e.response.status === 401) {
          console.log("Login failed as expected (not verified?):", e.response.data);
      } else {
          console.log("Login failed for unknown reason");
      }
    }
  } catch(e) {
    if (e.response) console.log("Error:", e.response.status, e.response.data);
    else console.log("Error:", e.message);
  }
}
run();
