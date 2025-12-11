// This points to your running Flask server
const BASE_URL = 'http://127.0.0.1:5000';

export const getStatus = async () => {
    try {
        const response = await fetch(`${BASE_URL}/api/data`);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};