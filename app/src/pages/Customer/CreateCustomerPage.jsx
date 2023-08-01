// Used for creating new Item Types

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { AdornedFormInput, FormInput, FormSelectInput } from "../../components/FormComponents";
import { effectAbortSignal, newAbortSignal, refreshSignal, useUnmountSignalCancel } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";
import { LoadingButton } from "@mui/lab";
import { Close, DeleteOutline, Send as SendIcon, Undo } from "@mui/icons-material";
import "../../sass/CreateCustomerSubPage.scss"
import { Button, IconButton } from "@mui/material";
import { deleteUndefined, getKey, stateAbbreviations } from "../../tools/generalTools";

const CreateCustomerPage = (props) => {

    // Inherited props
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    // Only inherited when composed by ItemTypeManagementPage
    const { editingId } = props;

    const [customerFirstName, setCustomerFirstName] = useState("")
    const [customerFirstNameError, setCustomerFirstNameError] = useState("");

    const [customerMiddleName, setCustomerMiddleName] = useState("")
    const [customerMiddleNameError, setCustomerMiddleNameError] = useState("");

    const [customerLastName, setCustomerLastName] = useState("")
    const [customerLastNameError, setCustomerLastNameError] = useState("")

    const [addresses, setAddresses] = useState([]);

    const [contacts, setContacts] = useState([])

    useEffect(() => {

        lockExitWith("Unsaved changes will be lost. Are you sure?")

        if (editingId) {

            const { controller, isCleanedUp, cleanup } = effectAbortSignal(5);

            (async () => {
                try {
                    const { data: { customer } } = await axios.get(`${SERVER_URL}/customer/getCustomer`, { params: { customerId: editingId }, signal: controller.signal })
                    console.log("Loaded up the following customer for editing:", customer)

                    setCustomerFirstName(customer.customerFirstName);
                    setCustomerMiddleName(customer.customerMiddleName);
                    setCustomerLastName(customer.customerLastName);
                    setAddresses(customer.addresses.map(address => ({
                        ...address,
                        myKey: getKey(),
                        errors: {},
                        flaggedForDeletion: false
                    })))
                    setContacts(customer.contacts.map(contact => ({
                        ...contact,
                        myKey: getKey(),
                        errors: {},
                        flaggedForDeletion: false
                    })))
                }
                catch (err) {
                    if (axios.isCancel(err)) return `Request canceled due to ${isCleanedUp() ? "timeout" : "cleanup"}`
                    console.log("Error at GET /itemType/getItemType", err);
                }
            })()

            return cleanup;
        }
    }, [editingId])

    const [loading, setLoading] = useState(false);

    // Form submitting

    const submitSignalRef = useRef();
    useUnmountSignalCancel(submitSignalRef);
    const submitForm = async () => {

        setLoading(true);
        refreshSignal(submitSignalRef);

        try {
            const config = { signal: submitSignalRef.current.signal };
            const data = {
                customerFirstName,
                customerMiddleName,
                customerLastName,
                addresses: addresses.map(a => deleteUndefined({
                    customerAddressId: a.customerAddressId, // Will be deleted if this is a new address
                    flaggedForDeletion: a.flaggedForDeletion, // Ditto
                    address: a.address,
                    town: a.town,
                    zip: a.zip,
                    state: a.state,
                })),
                contacts: contacts.map(c => deleteUndefined({
                    customerContactId: c.customerContactId, // Will be deleted if this is a new address
                    flaggedForDeletion: c.flaggedForDeletion, // Ditto
                    contactType: c.contactType,
                    contactValue: c.contactValue,
                })),
            }

            console.log("Sending the following to server:", data);

            if (!editingId) {
                await axios.post(`${SERVER_URL}/customer/createCustomer`, data, config);
            }
            else {
                data.customerId = editingId;
                await axios.put(`${SERVER_URL}/customer/updateCustomer`, data, config);
            }

            unlockExit();
            addDashboardMessage("customerCreationSuccess", { type: "success", text: `Customer has been successfully ${editingId ? "updated" : "created"}` })
            trySelectNode("manageCustomers")
            refreshNavInfo();
        }
        catch (err) {
            console.log("Error creating or updating customer", err);
            if (axios.isCancel(err)) return console.log("Request canceled due to timeout or unmount", err);

            // Validation errors
            if (err.response?.data) {

                const {
                    customerFirstNameError,
                    customerMiddleNameError,
                    customerLastNameError,
                    addressErrors = [],
                    contactErrors = [],
                } = err.response.data;

                // Update customer errors
                setCustomerFirstNameError(customerFirstNameError);
                setCustomerMiddleNameError(customerMiddleNameError);
                setCustomerLastNameError(customerLastNameError);

                // Update address errors
                if (addressErrors.length > 0) {
                    for (let i = 0; i < addressErrors.length; i++)
                        addresses[i].errors = addressErrors[i];
                }
                else {
                    for (let address of addresses)
                        address.errors = {};
                }
                setAddresses([...addresses]);

                // Update contact errors
                if (contactErrors.length > 0) {
                    for (let i = 0; i < contactErrors.length; i++)
                        contacts[i].errors = contactErrors[i];
                }
                else {
                    for (let contact of contacts)
                        contact.errors = {};
                }
                setContacts([...contacts]);
            }
        }
        finally {
            setLoading(false)
        }
    }

    return (
        <div className="create-customer-sub-page">
            <h2 className="sub-page-heading">
                {editingId ? "Edit" : "Create New"} Customer
            </h2>
            <div className="create-customer-form">
                <div className="row gx-0">
                    <div className="col-lg-4">
                        <div className="form-control">
                            <FormInput
                                fullWidth
                                label="First Name"
                                value={customerFirstName}
                                setState={setCustomerFirstName}
                                errorText={customerFirstNameError}>
                            </FormInput>
                        </div>
                    </div>
                    <div className="col-lg-4">
                        <div className="form-control">
                            <FormInput
                                fullWidth
                                label="Middle Name"
                                value={customerMiddleName}
                                setState={setCustomerMiddleName}
                                errorText={customerMiddleNameError}>
                            </FormInput>
                        </div>
                    </div>
                    <div className="col-lg-4">
                        <div className="form-control">
                            <FormInput
                                fullWidth
                                label="Last Name"
                                value={customerLastName}
                                setState={setCustomerLastName}
                                errorText={customerLastNameError}>
                            </FormInput>
                        </div>
                    </div>
                </div>
                <div className="creation-panel-group">
                    <h3 className="heading">
                        Addresses
                    </h3>
                    {addresses.length !== 0 && addresses.map((address, index) =>
                        <AddressCreationPanel
                            myIndex={index}
                            key={address.myKey}
                            addresses={addresses}
                            setAddresses={setAddresses}
                            self={address}
                            {...address}>
                        </AddressCreationPanel>
                    )}
                    {addresses.length === 0 && <p className="none-yet">This customer does not have any addresses</p>}
                    <Button
                        className="customer-button"
                        color="primary"
                        size="large"
                        variant="contained"
                        onClick={() => {
                            addresses.push({
                                myKey: getKey(),
                                errors: {},
                                address: "",
                                town: "",
                                zip: "",
                                state: "",
                            })
                            setAddresses([...addresses]);

                        }}>
                        <span>Add Customer Address</span>
                    </Button>
                </div>
                <div className="creation-panel-group">
                    <h3 className="heading">
                        Contacts
                    </h3>
                    {contacts.length !== 0 && contacts.map((contact, index) =>
                        <ContactCreationPanel
                            myIndex={index}
                            key={contact.myKey}
                            myKey={contact.myKey}
                            contacts={contacts}
                            setContacts={setContacts}
                            self={contact}
                            {...contact}>
                        </ContactCreationPanel>
                    )}
                    {contacts.length === 0 && <p className="none-yet">This customer does not have any contacts</p>}
                    <Button
                        className="customer-button"
                        color="primary"
                        size="large"
                        variant="contained"
                        onClick={() => {
                            contacts.push({
                                myKey: getKey(),
                                contactType: "",
                                contactValue: "",
                                errors: {},
                            })
                            setContacts([...contacts]);
                        }}>
                        <span>Add Customer Contact</span>
                    </Button>
                </div>
                <div className="form-control d-flex justify-content-center">
                    <LoadingButton
                        className="customer-button"
                        color="error"
                        size="large"
                        onClick={submitForm}
                        endIcon={<SendIcon />}
                        loading={loading}
                        loadingPosition="end"
                        variant="contained">
                        <span>{editingId ? "Edit" : "Create"} Customer</span>
                    </LoadingButton>
                </div>
            </div>
        </div>
    )
}

// If customerAddressId exists it is implied that this address already exists in the database
const AddressCreationPanel = (props) => {

    // Identity/location props and setters
    const { self, myKey, myIndex, addresses, setAddresses } = props;

    // State props and error handling for creating or editing
    const { address, town, zip, state, errors } = props;

    // For specifically editing
    const { customerAddressId, flaggedForDeletion } = props;

    const isEditing = customerAddressId !== null && customerAddressId !== undefined;

    let buttonJsx;
    if (isEditing) {

        if (flaggedForDeletion) {
            buttonJsx = (
                <IconButton size="medium" onClick={() => {
                    self.flaggedForDeletion = false;
                    setAddresses([...addresses]);
                }}>
                    <Undo fontSize="medium" />
                </IconButton>
            )
        }
        else {
            buttonJsx = (
                <IconButton size="medium" onClick={() => {
                    self.flaggedForDeletion = true;
                    setAddresses([...addresses]);
                }}>
                    <DeleteOutline fontSize="medium" />
                </IconButton>
            )
        }

    }
    else {
        buttonJsx = (
            <IconButton size="medium" onClick={() => setAddresses(addresses.filter(a => a.myKey !== myKey))}>
                <Close fontSize="medium" />
            </IconButton>
        )
    }

    const additionalClasses = flaggedForDeletion ? " flaggedForDeletion" : "";

    return (
        <div className={"creation-panel" + additionalClasses}>
            <div className="creation-panel-header">
                <h5 className="creation-panel-heading">Address {myIndex + 1}</h5>
                <div className="creation-panel-icon-button">
                    {buttonJsx}
                </div>
            </div>
            <div className="row gx-0">
                <div className="col-12">
                    <div className="form-control">
                        <FormInput
                            size="small"
                            minHelperText
                            fullWidth
                            value={address}
                            onChange={(e) => {
                                self.address = e.target.value;
                                setAddresses([...addresses]);
                            }}
                            errorText={errors.addressError}
                            label="Address">
                        </FormInput>
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="form-control">
                        <FormInput
                            minHelperText
                            fullWidth
                            size="small"
                            value={town}
                            onChange={(e) => {
                                self.town = e.target.value;
                                setAddresses([...addresses]);
                            }}
                            errorText={errors.townError}
                            label="Town">
                        </FormInput>
                    </div>
                </div>
                <div className="col-6 col-lg-3">
                    <div className="form-control">
                        <FormSelectInput
                            size="small"
                            minHelperText
                            fullWidth
                            value={state}
                            onChange={(e) => {
                                self.state = e.target.value;
                                setAddresses([...addresses]);
                            }}
                            values={stateAbbreviations}
                            errorText={errors.stateError}
                            label="State">
                        </FormSelectInput>
                    </div>
                </div>
                <div className="col-6 col-lg-3">
                    <div className="form-control">
                        <FormInput
                            size="small"
                            minHelperText
                            fullWidth
                            value={zip}
                            onChange={(e) => {
                                self.zip = e.target.value;
                                setAddresses([...addresses]);
                            }}
                            errorText={errors.zipError}
                            label="Zip">
                        </FormInput>
                    </div>
                </div>
            </div>
        </div>
    )
}

const ContactCreationPanel = (props) => {

    // Identity/location props and setters
    const { self, myKey, myIndex, contacts, setContacts } = props;

    // State props and error handling for creating or editing
    const { contactType, contactValue, errors } = props;

    // For specifically editing
    const { customerContactId, flaggedForDeletion } = props;

    const isEditing = customerContactId !== null && customerContactId !== undefined;

    let buttonJsx;
    if (isEditing) {

        if (flaggedForDeletion) {
            buttonJsx = (
                <IconButton size="medium" onClick={() => {
                    self.flaggedForDeletion = false;
                    setContacts([...contacts]);
                }}>
                    <Undo fontSize="medium" />
                </IconButton>
            )
        }
        else {
            buttonJsx = (
                <IconButton size="medium" onClick={() => {
                    self.flaggedForDeletion = true;
                    setContacts([...contacts]);
                }}>
                    <DeleteOutline fontSize="medium" />
                </IconButton>
            )
        }

    }
    else {
        buttonJsx = (
            <IconButton size="medium" onClick={() => setContacts(contacts.filter(c => c.myKey !== myKey))}>
                <Close fontSize="medium" />
            </IconButton>
        )
    }

    const additionalClasses = flaggedForDeletion ? " flaggedForDeletion" : "";

    return (
        <div className={"creation-panel" + additionalClasses}>
            <div className="creation-panel-header">
                <h5 className="creation-panel-heading">Contact {myIndex + 1}</h5>
                <div className="creation-panel-icon-button">
                    {buttonJsx}
                </div>
            </div>
            <div className="row gx-0">
                <div className="col-lg-6">
                    <div className="form-control">
                        <FormSelectInput
                            size="small"
                            minHelperText
                            fullWidth
                            value={contactType}
                            onChange={(e) => {
                                self.contactType = e.target.value;
                                setContacts([...contacts]);
                            }}
                            values={["Email", "Cell Phone", "Home Phone"]}
                            label="Contact Type">
                        </FormSelectInput>
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="form-control">
                        <FormInput
                            minHelperText
                            fullWidth
                            size="small"
                            value={contactValue}
                            onChange={(e) => {
                                self.contactValue = e.target.value;
                                setContacts([...contacts]);
                            }}
                            errorText={errors.contactValueError}
                            label="Contact Value">
                        </FormInput>
                    </div>
                </div>
            </div>
        </div>
    )
}


export default CreateCustomerPage;