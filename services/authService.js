require('dotenv').config({ quiet: true });

const axios = require('axios');
const logger = require('./loggerService');

const DEFAULT_LICENSE_URL = 'https://SEU_BACKEND/licenca';
const DEFAULT_LICENSE_REVALIDATION_INTERVAL_MS = 300000;
const DEFAULT_AUTH_STATUS = {
    authorized: false,
    origin: 'desconhecido',
    number: '',
    reason: 'Nao validado',
    checkedAt: null
};

let authStatus = { ...DEFAULT_AUTH_STATUS };

const getAuthorizedNumbersFromEnv = () => {
    return (process.env.LOCAL_AUTHORIZED_NUMBERS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
};

const getAuthConfig = () => {
    const licenseApiUrl = process.env.LICENSE_API_URL || DEFAULT_LICENSE_URL;

    return {
        licenseApiUrl,
        authListUrl: process.env.AUTH_LIST_URL || licenseApiUrl,
        localAuthorizedNumbers: getAuthorizedNumbersFromEnv(),
        revalidationIntervalMs: Number(
            process.env.LICENSE_REVALIDATION_INTERVAL_MS || DEFAULT_LICENSE_REVALIDATION_INTERVAL_MS
        )
    };
};

const getClientNumber = (client) => {
    return client?.info?.wid?._serialized || '';
};

const setAuthStatus = (partialStatus = {}) => {
    authStatus = {
        ...authStatus,
        ...partialStatus,
        checkedAt: new Date().toISOString()
    };

    return authStatus;
};

const resetAuthStatus = () => {
    authStatus = { ...DEFAULT_AUTH_STATUS };
    return authStatus;
};

const getAuthStatus = () => {
    return { ...authStatus };
};

const isNumberInFallback = (number, fallbackNumbers = getAuthConfig().localAuthorizedNumbers) => {
    return Array.isArray(fallbackNumbers) && fallbackNumbers.includes(number);
};

const normalizeAuthorizationResponse = (data, number) => {
    if (typeof data?.authorized === 'boolean') {
        return data.authorized;
    }

    if (Array.isArray(data?.authorizedNumbers)) {
        return data.authorizedNumbers.includes(number);
    }

    if (Array.isArray(data)) {
        return data.includes(number);
    }

    return false;
};

const fetchRemoteAuthorization = async (number, options = {}) => {
    const config = getAuthConfig();
    const {
        requestUrl = config.licenseApiUrl,
        authListUrl = config.authListUrl,
        timeout = 5000
    } = options;

    try {
        const response = await axios.get(requestUrl, {
            params: { numero: number },
            timeout
        });

        return normalizeAuthorizationResponse(response.data, number);
    } catch (licenseError) {
        if (!authListUrl || authListUrl === requestUrl) {
            throw licenseError;
        }

        const response = await axios.get(authListUrl, { timeout });
        return normalizeAuthorizationResponse(response.data, number);
    }
};

const checkLicense = async (client, options = {}) => {
    const number = getClientNumber(client);

    if (!number) {
        setAuthStatus({
            authorized: false,
            origin: 'erro',
            number: '',
            reason: 'Nao foi possivel obter o numero do cliente'
        });
        logger.error('Nao foi possivel obter o numero do cliente para validar a licenca.');
        return false;
    }

    logger.info(`Validando licenca para ${number}.`);

    try {
        const authorized = await fetchRemoteAuthorization(number, options);

        if (authorized) {
            setAuthStatus({
                authorized: true,
                origin: 'remoto',
                number,
                reason: 'Autorizado pela API remota'
            });
            logger.info(`Numero ${number} autorizado. Origem da decisao: remoto.`);
        } else {
            setAuthStatus({
                authorized: false,
                origin: 'remoto',
                number,
                reason: 'Numero nao autorizado pela API remota'
            });
            logger.warn(`Numero ${number} nao autorizado. Origem da decisao: remoto.`);
        }

        return authorized;
    } catch (error) {
        logger.warn(`Falha na validacao remota para ${number}. Origem da decisao: erro remoto.`);

        const fallbackNumbers = options.fallbackNumbers || getAuthConfig().localAuthorizedNumbers;
        const fallbackAuthorized = isNumberInFallback(number, fallbackNumbers);

        if (fallbackAuthorized) {
            setAuthStatus({
                authorized: true,
                origin: 'fallback',
                number,
                reason: 'Autorizado pelo fallback local'
            });
            logger.warn(`Numero ${number} autorizado. Origem da decisao: fallback local.`);
            return true;
        }

        setAuthStatus({
            authorized: false,
            origin: 'erro',
            number,
            reason: 'Falha remota e numero ausente no fallback local'
        });
        logger.error(`Numero ${number} bloqueado. Motivo: falha remota e ausencia de autorizacao no fallback local.`, error);
        return false;
    }
};

const createLicenseRevalidator = (client, options = {}) => {
    const intervalMs = options.intervalMs || getAuthConfig().revalidationIntervalMs;
    let timer = null;

    const runCheck = async () => {
        const authorized = await checkLicense(client, options);

        if (!authorized) {
            if (typeof options.onUnauthorized === 'function') {
                options.onUnauthorized();
            }
        }

        return authorized;
    };

    return {
        start() {
            if (!intervalMs || intervalMs <= 0 || timer) {
                return null;
            }

            const log = options.logger || logger;
            log.info(`Revalidacao de licenca agendada a cada ${intervalMs} ms.`);

            timer = setInterval(() => {
                runCheck().catch((error) => {
                    logger.error('Erro inesperado durante a revalidacao da licenca.', error);

                    if (typeof options.onError === 'function') {
                        options.onError(error);
                    }
                });
            }, intervalMs);

            return timer;
        },
        stop() {
            if (!timer) {
                return;
            }

            clearInterval(timer);
            timer = null;
        }
    };
};

module.exports = {
    DEFAULT_LICENSE_URL,
    checkLicense,
    createLicenseRevalidator,
    fetchRemoteAuthorization,
    getAuthConfig,
    getAuthStatus,
    getAuthorizedNumbersFromEnv,
    getClientNumber,
    isNumberInFallback,
    normalizeAuthorizationResponse,
    resetAuthStatus,
    setAuthStatus
};
