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
    
    // Attempt to login
    const loginRes = await axios.post('http://localhost:5206/api/auth/login', {
      email: email,
      password: 'Password@123'
    });
    const token = loginRes.data.token;
    console.log("Logged in right away?", !!token);

    // get jobs
    const jobsRes = await axios.get('http://localhost:5206/api/jobs');
    if (jobsRes.data.length === 0) {
      console.log("No jobs found.");
      return;
    }
    const jobId = jobsRes.data[0].id;
    console.log("Applying to job:", jobId);

    try {
      const applyRes = await axios.post(`http://localhost:5206/api/jobapplications/apply/${jobId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Apply status:", applyRes.status, applyRes.data);
    } catch (e) {
      if (e.response) console.log("Apply failed:", e.response.status, e.response.data);
      else console.log("Apply failed:", e.message);
    }
  } catch(e) {
    if (e.response) console.log("Error:", e.response.status, e.response.data);
    else console.log("Error:", e.message);
  }
}
run();
