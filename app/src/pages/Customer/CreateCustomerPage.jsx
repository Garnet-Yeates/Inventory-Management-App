// Used for creating new customers or editing existing ones

import { useNavigate } from "react-router-dom";
import { mountAbortSignal } from "../../tools/axiosTools";
import axios from "axios";
import { useEffect, useState } from "react";
import { SERVER_URL } from "../App";
 
const CreateCustomerPage = (props) => {

    const { editingId, lockExitWith, unlockExit } = props;

    const [ customerName, setCustomerName ] = useState("");

    const [customerAddresses, setCustomerAddresses] = useState("");
    // Flag for whether or not the 'Create Customer Address' modal should be open
    const [addingCustomerAddress, setAddingCustomerAddress] = useState("");

    const [customerContacts, setCustomerContacts] = useState("");
    // Flag for whether or not the 'Create Customer Contact' modal should be open
    const [addingCustomerContact, setAddingCustomerContact] = useState("");

    const navigate = useNavigate();

    // Mount/Prop-Change effect to fetch existing customer data if 'editingId' is defined on mount or changes
    useEffect(() => {

        if (!editingId)
            return;

        const { controller, isCleanedUp, cleanup } = mountAbortSignal(5);

        (async () => {

            try {
                let response = await axios.get(`${SERVER_URL}/itemType`, { params: { itemTypeId: editingId }, signal: controller.signal })
                
                const { customerName, customerId, addresses, contacts } = response;

            }
            catch (err) {
                if (axios.isCancel(err)) return `Request canceled due to ${isCleanedUp() ? "timeout" : "cleanup"}`

                console.log("Error at GET /auth/loggedInCheck", err);
            }
        })()

        return cleanup;

    }, [editingId]);

    return (
        <div className="create-customer-sub-page">
            <h2 className="sub-page-heading">Create Customer Page (TODO)</h2>
        </div>
    )

}

export default CreateCustomerPage;