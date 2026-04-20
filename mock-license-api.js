require('dotenv').config();

const http = require('http');
const { URL } = require('url');

const DEFAULT_PORT = Number(process.env.MOCK_LICENSE_API_PORT || 4010);
const DEFAULT_AUTHORIZED_NUMBERS = (process.env.MOCK_AUTHORIZED_NUMBERS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const createLicenseResponse = (number, authorizedNumbers = DEFAULT_AUTHORIZED_NUMBERS) => {
    return {
        authorized: authorizedNumbers.includes(number)
    };
};

const createMockLicenseServer = (options = {}) => {
    const port = options.port || DEFAULT_PORT;
    const authorizedNumbers = options.authorizedNumbers || DEFAULT_AUTHORIZED_NUMBERS;

    const server = http.createServer((request, response) => {
        const requestUrl = new URL(request.url, `http://127.0.0.1:${port}`);

        if (requestUrl.pathname !== '/licenca') {
            response.writeHead(404, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: 'Rota nao encontrada' }));
            return;
        }

        const number = requestUrl.searchParams.get('numero') || '';
        const payload = createLicenseResponse(number, authorizedNumbers);

        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(payload));
    });

    return {
        server,
        start() {
            return new Promise((resolve) => {
                server.listen(port, '127.0.0.1', () => resolve(server));
            });
        },
        stop() {
            return new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });
        }
    };
};

if (require.main === module) {
    const mockServer = createMockLicenseServer();

    mockServer.start().then(() => {
        process.stdout.write(`Mock de licenca ativo em http://127.0.0.1:${DEFAULT_PORT}/licenca\n`);
    });
}

module.exports = {
    DEFAULT_AUTHORIZED_NUMBERS,
    DEFAULT_PORT,
    createLicenseResponse,
    createMockLicenseServer
};
