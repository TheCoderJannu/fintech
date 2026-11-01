// Quick test to verify rate limiting works
const http = require('http');

function makeLogin(username, password) {
    return new Promise((resolve) => {
        const data = JSON.stringify({ username, password });
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/admin/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                resolve({ status: res.statusCode, body: JSON.parse(body) });
            });
        });
        req.write(data);
        req.end();
    });
}

async function main() {
    console.log('=== BRUTE FORCE TEST ===');
    for (let i = 1; i <= 7; i++) {
        const r = await makeLogin('hacker', 'wrong' + i);
        console.log(`Attempt ${i}: [${r.status}] ${r.body.error || 'SUCCESS: ' + r.body.success}`);
    }
    
    console.log('\n=== CORRECT CREDENTIALS (should still be locked) ===');
    const locked = await makeLogin('navya_admin', 'Aryan@12345');
    console.log(`Correct creds while locked: [${locked.status}] ${locked.body.error || 'SUCCESS: ' + locked.body.success}`);
}

main();
