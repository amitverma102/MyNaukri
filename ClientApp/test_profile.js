const axios = require('axios');

async function run() {
  try {
    // Attempt to login
    const loginRes = await axios.post('http://localhost:5206/api/auth/login', {
      email: 'candidate1@example.com',
      password: 'Password123!'
    });
    const token = loginRes.data.token;
    console.log("Got token!");

    // Fetch profile
    const profileRes = await axios.get('http://localhost:5206/api/candidates/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Profile Data:", JSON.stringify(profileRes.data, null, 2));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
