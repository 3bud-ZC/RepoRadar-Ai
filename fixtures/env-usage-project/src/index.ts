const dbUrl = process.env.DATABASE_URL;
const apiUrl = import.meta.env.VITE_API_URL;

export const config = { dbUrl, apiUrl };

