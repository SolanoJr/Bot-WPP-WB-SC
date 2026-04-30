const axios = require('axios');
require('dotenv').config();
async function run() {
    const key = process.env.GEMINI_API_KEY;
    try {
        const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        console.log(JSON.stringify(res.data.models.map(m => m.name), null, 2));
    } catch(e) {
        console.error(e.message);
    }
}
run();
