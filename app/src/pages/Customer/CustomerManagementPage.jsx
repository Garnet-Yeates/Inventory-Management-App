import axios from "axios";
import { useEffect, useState } from "react";
import { mountAbortSignal } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";
import "../../sass/CustomerManagement.scss"
import { Button } from "@mui/material";
import { Add, Edit, Visibility } from "@mui/icons-material";
import CreateCustomerPage from "./CreateCustomerPage";
import { formatToUSCurrency } from "../../tools/generalTools";

const CustomerManagementPage = (props) => {

    // Inherited props
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    // Props that can exist when props for this page are overriden
    const { viewingSpecificCustomer, editingSpecificCustomer } = props;

    const passDownProps = {
        selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage,
    }

    if (viewingSpecificCustomer) {
        return <ViewCustomerPage customerId={viewingSpecificCustomer} {...passDownProps} />
    }

    if (editingSpecificCustomer) {
        return <CreateCustomerPage editingId={editingSpecificCustomer} {...passDownProps} />
    }

    return <CustomersView {...passDownProps} />
}

const CustomersView = (props) => {

    // Inherited props
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    const [customers, setCustomers] = useState([]);

    // Upon mount we use a GET request to get a list of all item types so we can display them
    useEffect(() => {

        const { controller, isCleanedUp, cleanup } = mountAbortSignal(5);

        (async () => {
            try {
                let response = await axios.get(`${SERVER_URL}/customer/getCustomers`, { signal: controller.signal })
                console.log("CustomersView mount GET /customer/getCustomers", response);
                setCustomers(response.data.customers);
            }
            catch (err) {
                if (axios.isCancel(err)) return `Request canceled due to ${isCleanedUp() ? "timeout" : "unmount"}`
                console.log("Error CustomersView mount GET /customer/getCustomers", err);
            }
        })()

        return cleanup;

    }, []);

    return (
        <div className="customer-management-sub-page">
            <h2 className="sub-page-heading">Customer Management</h2>
            <div className="customers-display-container">
                {customers.map((customer) => <SimpleCustomerDisplay
                    key={customer.customerId}
                    customer={customer}
                    trySelectNode={trySelectNode}
                />)}
            </div>
        </div>
    )
}

const ViewCustomerPage = (props) => {

    // Inherited props
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    // Specific props
    const { customerId } = props;

    return <div>What a view</div>

}

export const SimpleCustomerDisplay = (props) => {

    const {
        customer: {
            customerId,
            customerFirstName,
            customerMiddleName,
            customerLastName,
            addresses,
            contacts,
            dateAdded,
        },
        trySelectNode,
    } = props;

    const customerFullName = customerFirstName + (customerMiddleName ? ` ${customerMiddleName}` : "") + ` ${customerLastName}`;
    const numAddresses = addresses.length;
    const numContacts = contacts.length;

    const are = (numContacts !== 1) ? "are" : "is";
    const methods = (numContacts !== 1) ? "methods" : "method"
    const addressText = (numAddresses !== 1) ? "addresses" : "address"

    return (
        <div className="customer-display-container">
            <div className="name-date-group">
                <span className="customer-name">
                    {customerFullName}
                </span>
                <span className="date-added">
                    {dateAdded}
                </span>
            </div>
            <p className="address-count">
                This customer has {numAddresses} {addressText} on record
            </p>
            <p className="contact-count">
                There {are} {numContacts} {methods} of contact on record for this customer
            </p>
            <div className="button-group Mui-ButtonCompression">
                <Button
                    size="small"
                    color="secondary"
                    onClick={() => {
                        trySelectNode("manageCustomers", {
                            programmatic: true,
                            overrideProps: {
                                viewingSpecificCustomer: customerId,
                            }
                        })
                    }}
                    endIcon={<Visibility />}
                    variant="contained">
                    <span>View</span>
                </Button>
                <Button
                    size="small"
                    color="primary"
                    onClick={() => {
                        trySelectNode("manageCustomers", {
                            programmatic: true,
                            overrideProps: {
                                editingSpecificCustomer: customerId,
                            }
                        })
                    }}
                    endIcon={<Edit />}
                    variant="contained">
                    <span>Edit</span>
                </Button>
            </div>
        </div>
    )
}

export default CustomerManagementPage;