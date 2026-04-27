const express = require('express');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');

const app = express();
const port = 3000;

// Servir arquivos estáticos
app.use(express.static(__dirname));

let currentQR = null;

const client = new Client({
    authStrategy: new LocalAuth(),
    webVersion: '2.3000.1015901620',
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015901620.html'
    },
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', async (qr) => {
    console.log('QR Code recebido!');
    currentQR = qr;
    
    // Gerar QR code como base64
    const qrDataUrl = await qrcode.toDataURL(qr, {
        errorCorrectionLevel: 'H',
        type: 'png',
        quality: 0.92,
        margin: 1,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        },
        width: 300
    });
    
    currentQR = qrDataUrl;
    console.log('QR Code disponível em: http://localhost:3000');
});

client.on('ready', () => {
    console.log('Bot conectado com sucesso!');
    currentQR = null;
});

client.on('authenticated', () => {
    console.log('Autenticado!');
    currentQR = null;
});

// API endpoint para obter o QR code
app.get('/api/qrcode', (req, res) => {
    if (currentQR) {
        if (currentQR.startsWith('data:image')) {
            // Se já é base64, extrair apenas o data
            const base64Data = currentQR.split(',')[1];
            res.json({ qr: base64Data });
        } else {
            // Se é o QR code original, gerar base64
            qrcode.toDataURL(currentQR, {
                errorCorrectionLevel: 'H',
                width: 300
            }).then(dataUrl => {
                const base64Data = dataUrl.split(',')[1];
                res.json({ qr: base64Data });
            }).catch(err => {
                res.status(500).json({ error: 'Erro ao gerar QR code' });
            });
        }
    } else {
        res.json({ qr: null });
    }
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'qrcode.html'));
});

// Iniciar servidor e cliente
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log('Aguardando QR code...');
});

client.initialize().catch(console.error);
