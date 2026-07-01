export const isDevelopment = process.env.NODE_ENV === 'development';

export const CONFIG = {
    // Environment Check
    IS_DEV: isDevelopment,

    // App URLs
    AUTH_URL: isDevelopment
        ? (process.env.NEXT_PUBLIC_AUTH_URL_DEV || 'http://localhost:3000')
        : (process.env.NEXT_PUBLIC_AUTH_URL_PROD || 'https://auth.hunacloud.net'),

    QUOTE_URL: isDevelopment
        ? (process.env.NEXT_PUBLIC_QUOTE_URL_DEV || 'http://localhost:3001')
        : (process.env.NEXT_PUBLIC_QUOTE_URL_PROD || 'https://quote.hunacloud.net'),

    CRM_URL: isDevelopment
        ? (process.env.NEXT_PUBLIC_CRM_URL_DEV || 'http://localhost:3003')
        : (process.env.NEXT_PUBLIC_CRM_URL_PROD || 'https://crm.hunacloud.net'),

    PAY_URL: isDevelopment
        ? (process.env.NEXT_PUBLIC_PAY_URL_DEV || 'http://localhost:3002')
        : (process.env.NEXT_PUBLIC_PAY_URL_PROD || 'https://pay.hunacloud.net'),

    PRODUCTION_URL: isDevelopment
        ? (process.env.NEXT_PUBLIC_PRODUCTION_URL_DEV || 'http://localhost:3004')
        : (process.env.NEXT_PUBLIC_PRODUCTION_URL_PROD || 'https://production.hunacloud.net'),

    INVOICE_URL: isDevelopment
        ? (process.env.NEXT_PUBLIC_INVOICE_URL_DEV || 'http://localhost:3005')
        : (process.env.NEXT_PUBLIC_INVOICE_URL_PROD || 'https://invoice.hunacloud.net'),

    DELIVERY_URL: isDevelopment
        ? (process.env.NEXT_PUBLIC_DELIVERY_URL_DEV || 'http://localhost:3009')
        : (process.env.NEXT_PUBLIC_DELIVERY_URL_PROD || 'https://giaohang.hunacloud.net'),
    // Cookies
    // If dev, domain is usually undefined (localhost). If prod, use shared domain logic.
    COOKIE_DOMAIN: isDevelopment
        ? undefined
        : (process.env.NEXT_PUBLIC_ROOT_DOMAIN_PROD || '.hunacloud.net'),
};
