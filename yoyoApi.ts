import axios from "axios";

const YOYO_API_BASE_URL = "https://api.yoyowallet.com"; // Replace with actual API URL
const API_KEY = "your-api-key-here"; // Secure this key properly

export const fetchVouchers = async () => {
  try {
    const response = await axios.get(`${YOYO_API_BASE_URL}/vouchers`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    throw error;
  }
};
