// Used for creating new Item Types

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { AdornedFormInput, FormInput } from "../../components/FormComponents";
import { mountAbortSignal, newAbortSignal, refreshSignal, useUnmountSignalCancel } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";
import { LoadingButton } from "@mui/lab";
import { Close, DeleteOutline, Send as SendIcon, Undo } from "@mui/icons-material";
import "../../sass/CreateCustomerSubPage.scss"
import { Button, IconButton } from "@mui/material";

let currKey = 0;
const getKey = () => currKey++;

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

    // This is a map that maps addressId to true. Only relevant when editing an existing customer
    const [removingAddresses, setRemovingAddresses] = useState({});
    const [removingContacts, setRemovingContacts] = useState({});

    useEffect(() => {

        lockExitWith("Unsaved changes will be lost. Are you sure?")

        if (editingId) {
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
                addresses: addresses.map(({ address, town, zip }) => ({ address, town, zip })),
                contacts: contacts.map(({ contactType, contactValue }) => ({ contactType, contactValue })),
            }

            console.log("Sending the following to server:", data);

            if (!editingId) {
                await axios.post(`${SERVER_URL}/customer/createCustomer`, data, config);
            }
            else {
                data.itemTypeId = editingId;
                await axios.put(`${SERVER_URL}/customer/updateCustomer`, data, config);
            }

            unlockExit();
            addDashboardMessage("itemTypeSuccess", { type: "success", text: `Customer has been successfully ${editingId ? "updated" : "created"}` })
            trySelectNode("manageCustomers", { programmatic: true })
        }
        catch (err) {
            console.log("Error creating or updating item type", err);
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
                setCustomerFirstNameError(customerFirstNameError);
                setCustomerMiddleNameError(customerMiddleNameError);
                setCustomerLastNameError(customerLastNameError);

                // Clear array errors 

                for (let address of addresses) {
                    address.errors = {}
                }

                for (let contact of contacts) {
                    contact.errors = {}
                }

                // Update array errors. Not that if there are 0 errors nothing happens here

                for (let i = 0; i < addressErrors.length; i++) {
                    addresses[i].errors = addressErrors[i];
                }

                for (let i = 0; i < contactErrors.length; i++) {
                    contacts[i].errors = contactErrors[i];
                }

                setAddresses([...addresses]);
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
                                state={customerFirstName}
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
                                state={customerMiddleName}
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
                                state={customerLastName}
                                setState={setCustomerLastName}
                                errorText={customerLastNameError}>
                            </FormInput>
                        </div>
                    </div>
                </div>
                <div className="addresses-or-contacts-container">
                    <h3 className="heading">
                        Addresses
                    </h3>
                    {addresses.length !== 0 && addresses.map((address, index) => (
                        <AddressCreationPanel
                            myIndex={index}
                            key={address.myKey}
                            myKey={address.myKey}
                            addresses={addresses}
                            setAddresses={setAddresses}
                            removingAddresses={removingAddresses}
                            setRemovingAddresses={setRemovingAddresses}
                            {...address}>
                        </AddressCreationPanel>
                    ))}
                    {addresses.length === 0 && <p className="none-yet">This customer does not have any addresses</p>}
                    <Button
                        color="primary"
                        size="large"
                        variant="contained"
                        onClick={() => {
                            addresses.push({
                                myKey: getKey(),
                                address: "",
                                zip: "",
                                town: "",
                                errors: {},
                            })
                            setAddresses([...addresses]);

                        }}>
                        <span>Add Customer Address</span>
                    </Button>
                </div>
                <div className="addresses-or-contacts-container">
                    <h3 className="heading">
                        Contacts
                    </h3>
                    {contacts.length !== 0 && contacts.map((contact, index) => (
                        <ContactCreationPanel
                            myIndex={index}
                            key={contact.myKey}
                            myKey={contact.myKey}
                            contacts={contacts}
                            setContacts={setContacts}
                            removingContacts={removingContacts}
                            setRemovingContacts={setRemovingContacts}
                            {...contact}>
                        </ContactCreationPanel>
                    ))}
                    {contacts.length === 0 && <p className="none-yet">This customer does not have any contacts</p>}
                    <Button
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
                <div className="form-control">
                    <LoadingButton
                        color="error"
                        fullWidth
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

// If addressId exists it is implied that this address already exists in the database
const AddressCreationPanel = ({ myIndex, addressId, myKey, errors, setAddresses, addresses, address, zip, town, removingAddresses, setRemovingAddresses }) => {

    const isEditing = addressId !== null && addressId !== undefined;

    // Only relevant if isEditing is true
    const willBeRemoved = removingAddresses[addressId];

    let buttonJsx;
    if (isEditing) {

        if (willBeRemoved) {
            const undoRemoveAddress = () => {
                delete removingAddresses[addressId];
                setRemovingAddresses({ ...removingAddresses });
            }

            buttonJsx = (
                <IconButton size="medium" onClick={undoRemoveAddress}>
                    <Undo fontSize="medium" />
                </IconButton>
            )
        }
        else {
            const removeAddress = () => {
                removingAddresses[addressId] = true;
                setRemovingAddresses({ ...removingAddresses });
            }

            buttonJsx = (
                <IconButton size="medium" onClick={removeAddress}>
                    <DeleteOutline fontSize="medium" />
                </IconButton>
            )
        }

    }
    else {

        const cancelAddress = () => {
            addresses = addresses.filter(a => a.myKey !== myKey);
            setAddresses([...addresses]);
        }

        buttonJsx = (
            <IconButton size="medium" onClick={cancelAddress}>
                <Close fontSize="medium" />
            </IconButton>
        )
    }

    return (
        <div className="individual-container">
            <div className="individual-container-header">
                <h5 className="individual-container-heading">Address {myIndex + 1}</h5>
                <div className="individual-container-icon-button">
                    {buttonJsx}
                </div>
            </div>
            <div className="row gx-0">
                <div className="col-12">
                    <div className="form-control">
                        <FormInput
                            size="small"
                            minErrorText
                            fullWidth
                            value={address}
                            onChange={({ target: { value } }) => {
                                addresses[myIndex].address = value;
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
                            minErrorText
                            fullWidth
                            size="small"
                            value={town}
                            onChange={({ target: { value } }) => {
                                addresses[myIndex].town = value;
                                setAddresses([...addresses]);
                            }}
                            errorText={errors.townError}
                            label="Town">
                        </FormInput>
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="form-control">
                        <FormInput
                            size="small"
                            minErrorText
                            fullWidth
                            value={zip}
                            onChange={({ target: { value } }) => {
                                addresses[myIndex].zip = value;
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

const ContactCreationPanel = ({ myIndex, myKey, contactId, errors, setContacts, contacts, contactType, contactValue, removingContacts, setRemovingContacts }) => {

    const isEditing = contactId !== null && contactId !== undefined;

    // Only relevant if isEditing is true
    const willBeRemoved = removingContacts[contactId];

    let buttonJsx;
    if (isEditing) {

        if (willBeRemoved) {
            const undoRemoveContact = () => {
                delete removingContacts[contactId];
                setRemovingContacts({ ...removingContacts });
            }

            buttonJsx = (
                <IconButton size="medium" onClick={undoRemoveContact}>
                    <Undo fontSize="medium" />
                </IconButton>
            )
        }
        else {
            const removeContact = () => {
                removingContacts[contactId] = true;
                setRemovingContacts({ ...removingContacts });
            }

            buttonJsx = (
                <IconButton size="medium" onClick={removeContact}>
                    <DeleteOutline fontSize="medium" />
                </IconButton>
            )
        }

    }
    else {

        const cancelContact = () => {
            contacts = contacts.filter(a => a.myKey !== myKey);
            setContacts([...contacts]);
        }

        buttonJsx = (
            <IconButton size="medium" onClick={cancelContact}>
                <Close fontSize="medium" />
            </IconButton>
        )
    }

    return (
        <div className="individual-container">
            <div className="individual-container-header">
                <h5 className="individual-container-heading">Contact {myIndex + 1}</h5>
                <div className="individual-container-icon-button">
                    {buttonJsx}
                </div>
            </div>
            <div className="row gx-0">
                <div className="col-lg-6">
                    <div className="form-control">
                        <FormInput
                            size="small"
                            minErrorText
                            fullWidth
                            value={contactType}
                            onChange={({ target: { value } }) => {
                                contacts[myIndex].contactType = value;
                                setContacts([...contacts]);
                            }}
                            errorText={errors.contactTypeError}
                            label="Contact type">
                        </FormInput>
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="form-control">
                        <FormInput
                            minErrorText
                            fullWidth
                            size="small"
                            value={contactValue}
                            onChange={({ target: { value } }) => {
                                contacts[myIndex].contactValue = value;
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