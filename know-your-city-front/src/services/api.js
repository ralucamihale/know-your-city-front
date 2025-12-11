const BASE_URL = 'http://127.0.0.1:5000';

export const getCities = async () => {
    try {
        const response = await fetch(`${BASE_URL}/api/cities`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        // The backend returns { status: "success", data: [...] }
        const result = await response.json();
        return result.data; // We only want the list inside 'data'
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
};