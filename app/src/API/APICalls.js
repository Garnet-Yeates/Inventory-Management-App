import axios from "axios";
import { SERVER_URL } from "../pages/App";

/**
 * Doesn't update state, doesn't need to be canceled on unmount or on subsequent calls
 * @param {(location: string) => void} navigate 
 */
export const logout = async (navigate) => {
    try {
        const response = await axios.get(`${SERVER_URL}/auth/logout`);
        console.log("/auth/logout response", response.data)
        navigate && navigate("/login");
    }
    catch (err) {
        console.log("Error with GET /auth/logout", err?.response?.data)
    }
}