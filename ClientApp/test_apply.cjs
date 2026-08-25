const { execSync } = require('child_process');
const axios = require('axios');

async function run() {
  const email = 'candidate' + Date.now() + '@test.com';
  console.log("Registering...", email);
  await axios.post('http://localhost:5206/api/auth/register', {
    firstName: 'Jane',
    lastName: 'Doe',
    email: email,
    password: 'Password@123',
    role: 'Candidate'
  });

  // Verify email directly via DB since we don't have the OTP
  console.log("Verifying email via psql...");
  execSync(`PGPASSWORD=postgres psql -U postgres -d MyNaukriDB -c "UPDATE \\"Users\\" SET \\"IsEmailVerified\\" = true WHERE \\"Email\\" = '${email}';"`);

  console.log("Logging in...");
  const loginRes = await axios.post('http://localhost:5206/api/auth/login', {
    email: email,
    password: 'Password@123'
  });
  const token = loginRes.data.token;
  console.log("Logged in.");

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
}
run();
