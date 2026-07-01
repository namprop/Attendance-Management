import fetch from 'node-fetch';

async function test() {
    const payload = {
      "connectorId": "CONNECTOR_HN_01",
      "deviceIp": "unknown002.ddns.net:8880",
      "source": "ZKTeco Gateway",
      "deviceType": "Vân tay",
      "event": "attendance",
      "userid": "110",
      "timestamp": "Tue May 26 2026 12:08:06 GMT+0700 (Giờ Đông Dương)",
      "data": {
        "userId": "110",
        "recordTime": "Tue May 26 2026 12:08:06 GMT+0700 (Giờ Đông Dương)",
        "ip": "unknown002.ddns.net:8880"
      }
    };

    try {
        const response = await fetch('http://localhost:3007/api/v1/webhook-zkteco', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer HUPUNA_2026_SECURE_KEY`
            },
            body: JSON.stringify(payload)
        });
        
        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
