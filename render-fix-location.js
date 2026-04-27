// Forçar deploy correto no Render
const express = require('express');
const { createApp } = require('./backend/app');

const app = createApp();

// Middleware para forçar URLs corretas
app.use('/location', (req, res, next) => {
    // Forçar frontend URL para Cloudflare Pages
    if (req.path === '/request/:userId') {
        const originalSend = res.json;
        res.json = function(data) {
            if (data.locationUrl && data.locationUrl.includes('100.101.218.16')) {
                data.locationUrl = data.locationUrl.replace('https://100.101.218.16:8443', 'https://bot-wpp-wb-sc.pages.dev');
            }
            return originalSend.call(this, data);
        };
    }
    next();
});

const PORT = process.env.PORT || 4010;
app.listen(PORT, () => {
    console.log(`Render backend corrigido rodando na porta ${PORT}`);
    console.log(`Frontend URL: https://bot-wpp-wb-sc.pages.dev`);
});
