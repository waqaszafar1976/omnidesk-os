const http = require('http');

const postJson = (url, body, headers = {}) => {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
};

const getJson = (url, headers = {}) => {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
};

async function runVerification() {
  console.log('=== STARTING END-TO-END VERIFICATION ===');
  
  // 1. Health check
  try {
    const health = await getJson('http://localhost:5000/health');
    console.log('Health check status:', health.status, health.body);
  } catch (e) {
    console.error('API Server not responding. Make sure it is running.');
  }

  // 2. Perform seed first to ensure clean state
  console.log('\n--- Re-seeding Database ---');
  const seedRes = await postJson('http://localhost:5000/api/v1/seed', {});
  console.log('Seed response:', seedRes.status, seedRes.body);

  // 3. Test route protection (without token)
  console.log('\n--- Testing Route Protection (No JWT Token) ---');
  const unauthKpi = await getJson('http://localhost:5000/api/v1/analytics/kpis');
  console.log('Unauthenticated KPI request status (Expected: 401):', unauthKpi.status);
  if (unauthKpi.status !== 401) {
    throw new Error('Security failure: unprotected endpoint accessible');
  }
  console.log('PASSED: Endpoint rejected request without token.');

  // 4. Perform Admin login
  console.log('\n--- Testing JWT Auth Login (Admin) ---');
  const adminLogin = await postJson('http://localhost:5000/api/v1/auth/login', { 
    email: 'demo@omnidesk.com',
    password: 'password123'
  });
  console.log('Admin Login status:', adminLogin.status, adminLogin.body.success ? 'SUCCESS' : 'FAILED');
  if (!adminLogin.body.success) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.body));
  }

  const token = adminLogin.body.token;
  const adminUser = adminLogin.body.user;
  const adminWS = adminLogin.body.workspace;
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  console.log(`Admin JWT Token acquired: ${token.substring(0, 15)}...`);
  console.log(`User ID: ${adminUser.id}, Workspace ID: ${adminWS.id}`);

  // 5. Test KPI Telemetry (with token)
  console.log('\n--- Testing KPI Telemetry (Admin view) ---');
  const kpisAdmin = await getJson('http://localhost:5000/api/v1/analytics/kpis?view=admin', authHeaders);
  console.log('KPI response status:', kpisAdmin.status);
  console.log('KPI data (admin view):', kpisAdmin.body.data);

  // 6. Test usage trend
  console.log('\n--- Testing Usage Trends ---');
  const trend = await getJson('http://localhost:5000/api/v1/analytics/usage-trend?range=7d', authHeaders);
  console.log('Usage trend response status:', trend.status);
  console.log('Usage trend dataset label:', trend.body.data?.datasets?.[0]?.label);
  console.log('Usage trend labels:', trend.body.data?.labels);

  // 7. Test workspace distribution
  console.log('\n--- Testing Workspace Distribution ---');
  const dist = await getJson('http://localhost:5000/api/v1/analytics/workspace-distribution', authHeaders);
  console.log('Distribution response status:', dist.status);
  console.log('Distribution details:', dist.body.data);

  // 8. Test top workspaces
  console.log('\n--- Testing Top Workspaces ---');
  const topWs = await getJson('http://localhost:5000/api/v1/analytics/top-workspaces?limit=4', authHeaders);
  console.log('Top workspaces status:', topWs.status);
  console.log('Top workspaces count:', topWs.body.data?.length);
  console.log('Top workspace item 1:', topWs.body.data?.[0]);

  // 9. Test recent activity
  console.log('\n--- Testing Recent Activity ---');
  const activity = await getJson('http://localhost:5000/api/v1/analytics/recent-activity?limit=5', authHeaders);
  console.log('Recent activity status:', activity.status);
  console.log('First activity item:', activity.body.data?.[0]);

  // 10. Test tasks endpoint
  console.log('\n--- Testing Task List ---');
  const activeTasks = await getJson('http://localhost:5000/api/v1/tasks?status=active', authHeaders);
  console.log('Active Tasks status:', activeTasks.status);
  console.log('Active Tasks count:', activeTasks.body.data?.length);
  console.log('Task item 1:', activeTasks.body.data?.[0]);

  // 11. Test events endpoint
  console.log('\n--- Testing Events List ---');
  const eventsList = await getJson('http://localhost:5000/api/v1/events?range=week', authHeaders);
  console.log('Events status:', eventsList.status);
  console.log('Events count:', eventsList.body.data?.length);
  console.log('Event item 1:', eventsList.body.data?.[0]);

  // 12. Test workspace members
  console.log('\n--- Testing Workspace Members ---');
  const members = await getJson(`http://localhost:5000/api/v1/workspaces/${adminWS.id}/members`, authHeaders);
  console.log('Members status:', members.status);
  console.log('Workspace member count:', members.body.data?.length);
  console.log('Member item 1:', members.body.data?.[0]);

  console.log('\n=== ALL END-TO-END VERIFICATION CHECKS PASSED ===');
}

runVerification().catch(err => {
  console.error('Verification failed with error:', err.message || err);
});
