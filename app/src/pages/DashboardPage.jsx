import { useEffect } from "react"
import "../sass/DashboardPage.scss"
import { SERVER_URL } from "./App";
import axios from "axios";

export default function DashboardPage() {

    useEffect(() => {
        
        // Fetch data from test endpoint that requires auth
        const fetchData = async() => {
            console.log("fesh")
            try {
                const response = await axios.get(`${SERVER_URL}/auth/test`);
                console.log("DASH response", response.data)
            }
            catch (err) {
                if (err.canceled) {
                //    return;
                }

                console.log("DASH ERR", err?.response?.data)
                console.log("err.dealtWith", err.dealtWith)
            }
        }

        fetchData();

    }, [])

    return(
        <div className="dashboard-page-container">
            <div className="dashboard-page">
                DASH BASH SMASH TRASH
            </div>
        </div>
    )
}