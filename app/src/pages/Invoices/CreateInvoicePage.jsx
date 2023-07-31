// Used for creating new Item Types

import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdornedFormInput, FormInput, FormSelectInput } from "../../components/FormComponents";
import { effectAbortSignal, newAbortSignal } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";
import { LoadingButton } from "@mui/lab";
import { Send as SendIcon } from "@mui/icons-material";
import "../../sass/CreateInvoice.scss"
import { formatToUSCurrency, getCustomerFullName, getKey } from "../../tools/generalTools";
import { DatePicker } from "@mui/x-date-pickers";
import { Button } from "@mui/material";
import { motion } from "framer-motion";

const CreateInvoicePage = (props) => {

    // Inherited props from dashboard
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    const [serviceName, setServiceName] = useState("");
    const [serviceNameError, setServiceNameError] = useState("");

    const [serviceDescription, setServiceDescription] = useState("");
    const [serviceDescriptionError, setServiceDescriptionError] = useState("")

    const [dateOfService, setDateOfService] = useState("");
    const [dateOfServiceError, setDateOfServiceError] = useState("")

    const [customerChoice, setCustomerChoice] = useState(""); // The customer object that we selected
    const [customerChoices, setCustomerChoices] = useState({}); // Maps customer full name to customer id (for select). Loaded upon mount
    const [customerChoiceError, setCustomerChoiceError] = useState("");

    const [customerAddressChoice, setCustomerAddressChoice] = useState("");
    const [customerAddressChoices, setCustomerAddressChoices] = useState({}); // Maps customer address to customer address id (refreshed whenever customer changes)
    const [customerAdddressChoiceError, setCustomerAddressChoiceError] = useState("")

    const [invoiceEntries, setInvoiceEntries] = useState([]);

    useEffect(() => {
        const { controller, isCleanedUp, cleanup } = effectAbortSignal(5);
        (async () => {
            try {
                let res = await axios.get(`${SERVER_URL}/customer/getCustomers`, { signal: controller.signal })
                console.log("CreateInvoicePage mount GET /customer/getCustomers", res);

                const newCustomerChoices = {};
                for (let customer of res.data.customers) {
                    const display = getCustomerFullName(customer);
                    const internalValue = customer;
                    newCustomerChoices[display] = internalValue;
                }
                setCustomerChoices(newCustomerChoices);
            }
            catch (err) {
                if (axios.isCancel(err)) return `Request canceled due to ${isCleanedUp() ? "timeout" : "unmount"}`
                console.log("Error CreateInvoicePage mount GET /customer/getCustomers", err);
            }
        })()
        return cleanup;
    }, []);

    // Whenever customer changes we set customerAddress to "" and refresh the address choices
    useEffect(() => {
        const newAddressChoices = {}
        for (let customerAddress of customerChoice?.addresses ?? []) {
            const display = `${customerAddress.address}, ${customerAddress.town}, ${customerAddress.state}, ${customerAddress.zip}`
            const internalValue = customerAddress;
            newAddressChoices[display] = internalValue;
        }
        setCustomerAddressChoice("")
        setCustomerAddressChoices(newAddressChoices);
    }, [customerChoice])

    const submitForm = () => {

    }

    return (
        <div className="create-invoice-sub-page">
            <h2 className="sub-page-heading">
                Create Invoice
            </h2>
            <div className="create-invoice-form">
                <div className="row gx-0">
                    <div className="col-lg-6">
                        <div className="form-control">
                            <FormInput
                                fullWidth
                                label="Service or Project Name"
                                value={serviceName}
                                setState={setServiceName}
                                errorText={serviceNameError}>
                            </FormInput>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="form-control">
                            <DatePicker
                                fullWidth
                                value={dateOfService}
                                onChange={(newValue) => setDateOfService(newValue)}
                                label="Date of Service"
                                slotProps={{
                                    textField: {
                                        variant: 'outlined',
                                        fullWidth: true,
                                        error: dateOfServiceError ? true : false,
                                        helperText: dateOfServiceError || " "
                                    }
                                }}>
                            </DatePicker>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="form-control">
                            <FormSelectInput
                                fullWidth
                                value={customerChoice}
                                setState={setCustomerChoice}
                                displayToValueMap={customerChoices}
                                label="Customer">
                            </FormSelectInput>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="form-control">
                            {true && <FormSelectInput
                                includeNullOption={true}
                                fullWidth
                                value={customerAddressChoice}
                                setState={setCustomerAddressChoice}
                                displayToValueMap={customerAddressChoices}
                                label="Address">
                            </FormSelectInput>}
                        </div>
                    </div>
                    <div className="col">
                        <div className="form-control">
                            <FormInput
                                fullWidth
                                multiline
                                rows={4}
                                label="Service Description"
                                value={serviceDescription}
                                setState={setServiceDescription}
                                errorText={serviceDescriptionError}>
                            </FormInput>
                        </div>
                    </div>
                </div>
                <EntryAdditionsContainer
                    invoiceEntries={invoiceEntries}
                    setInvoiceEntries={setInvoiceEntries}>
                </EntryAdditionsContainer>

                {invoiceEntries.length > 0 && <div className="form-control d-flex justify-content-center">
                    <LoadingButton
                        className="invoice-button"
                        color="error"
                        fullWidth
                        size="large"
                        onClick={submitForm}
                        endIcon={<SendIcon />}
                        loading={false} // TODO loading
                        loadingPosition="end"
                        variant="contained">
                        <span>Create Invoice</span>
                    </LoadingButton>
                </div>}
            </div>
        </div>
    )
}

const EntryAdditionsContainer = (props) => {

    const { invoiceEntries, setInvoiceEntries } = props;

    const [itemTypeChoices, setItemTypeChoices] = useState([]);

    useEffect(() => {
        const { controller, isCleanedUp, cleanup } = effectAbortSignal(5);
        (async () => {
            try {
                let res = await axios.get(`${SERVER_URL}/itemType/getItemTypes`, { signal: controller.signal })
                console.log("EntryAdditionsContainer mount GET /itemType/getItemTypes", res);

                const newItemTypeChoices = {};
                for (let itemType of res.data.itemTypes) {
                    const display = itemType.itemName;
                    const internalValue = itemType;
                    newItemTypeChoices[display] = internalValue;
                }
                setItemTypeChoices(newItemTypeChoices);
            }
            catch (err) {
                if (axios.isCancel(err)) return `Request canceled due to ${isCleanedUp() ? "timeout" : "unmount"}`
                console.log("Error at EntryAdditionsContainer mount GET /itemType/getItemTypes", err);
            }
        })()
        return cleanup;
    }, []);

    const subTotal = useMemo(() => {
        return formatToUSCurrency(invoiceEntries.reduce((accumulation, currentEntry) => {
            return accumulation + (Number(currentEntry.quantity) || 0) * (Number(currentEntry.price) || 0)
        }, 0))
    }, [invoiceEntries])

    let invoiceJsx;
    if (invoiceEntries.length === 0) {
        invoiceJsx = (
            <>
                <p className="none-yet">No Invoice Entries Yet</p>
                <Button
                    className="invoice-button"
                    color="success"
                    size="large"
                    variant="contained"
                    onClick={() => {
                        invoiceEntries.push({
                            myKey: getKey(),
                            errors: {},
                            itemType: null,
                            quantity: "",
                            price: "",
                        })
                        setInvoiceEntries([...invoiceEntries]);
                    }}>
                    <span>Begin Creating Entries</span>
                </Button >
            </>
        )
    }
    else {
        invoiceJsx = (
            <table className="entry-additions-table">
                <tr>
                    <th className="item">Product</th>
                    <th className="price">Price</th>
                    <th className="quantity">Quantity</th>
                    <th className="total">Total</th>
                </tr>
                {invoiceEntries.map((entry, index) =>
                    <InvoiceEntry
                        myIndex={index}
                        key={entry.myKey}
                        invoiceEntries={invoiceEntries}
                        setInvoiceEntries={setInvoiceEntries}
                        itemTypeChoices={itemTypeChoices}
                        self={entry}
                        {...entry}>
                    </InvoiceEntry>
                )}
                <tr>
                    <td colSpan={4}>
                        <div className="w-100">
                            <Button
                                fullWidth
                                color="success"
                                size="small"
                                variant="text"
                                onClick={() => {
                                    invoiceEntries.push({
                                        myKey: getKey(),
                                        errors: {},
                                        itemType: null,
                                        quantity: "",
                                        price: "",
                                    })
                                    setInvoiceEntries([...invoiceEntries]);
                                }}>
                                <span>Add Invoice Entry</span>
                            </Button>
                        </div>
                    </td>
                </tr>
                <tr className="first-aggregate">
                    <td className="none">

                    </td>
                    <td className="none">

                    </td>
                    <td className="total-description">
                        Sub Total
                    </td>
                    <td className="total-value">
                        {subTotal}
                    </td>
                </tr>
            </table>
        )
    }

    return (
        <div className="entry-additions-container">
            <h3 className="heading">
                Invoice Entries
            </h3>
            {invoiceJsx}
        </div>
    )
}

const InvoiceEntry = (props) => {

    // Identity state / location props
    const { self, myKey, myIndex, invoiceEntries, setInvoiceEntries } = props;

    // Self state props 
    const { itemType, quantity, price, errors } = props;

    // Other props
    const { itemTypeChoices } = props;

    const [choosingItemType, setChoosingItemType] = useState(false);

    const total = useMemo(() => (Number(quantity) * Number(price)) || 0, [quantity, price])

    const setPrice = (val) => {
        self.price = val;
        setInvoiceEntries([...invoiceEntries]);
    }

    // Detect when itemType changed. When it does
    useEffect(() => {
        self.quantity = "";
        self.price = itemType?.defaultSellPrice ?? "";
        setInvoiceEntries([...invoiceEntries])
    }, [itemType])

    const useThisLater = (
        <FormInput
            minHelperText
            fullWidth
            size="small"
            value={itemType?.itemCode}
            onChange={() => { }}
            onClick={(e) => {
                // setChoosingItemType(true);
                // TODO do this instead of the simple dropdown
            }}
        >
        </FormInput>
    )

    return (
        <>
            {choosingItemType && <ChooseItemModal invoiceEntry={self} setInvoiceEntries={setInvoiceEntries} setChoosingItemType={setChoosingItemType}></ChooseItemModal>}
            <tr onClick={(e) => e.ctrlKey && setInvoiceEntries(invoiceEntries.filter(entry => entry.myKey !== myKey))}>
                <td className="item">
                    <FormSelectInput
                        fullWidth
                        minHelperText
                        size="small"
                        value={itemType}
                        onChange={(e) => {
                            self.itemType = e.target.value;
                            setInvoiceEntries([...invoiceEntries])
                        }}
                        displayToValueMap={itemTypeChoices}>
                    </FormSelectInput>
                </td>
                <td className="price">
                    <AdornedFormInput
                        minHelperText
                        fullWidth
                        size="small"
                        type="number"
                        adornment="$"
                        placeholder={itemType?.defaultSellPrice ?? ""}
                        value={price}
                        setState={setPrice}
                        errorText={errors.priceError}>
                    </AdornedFormInput>
                </td>
                <td className="quantity">
                    <FormInput
                        minHelperText
                        fullWidth
                        size="small"
                        type="integer"
                        value={quantity}
                        onChange={(e) => {
                            self.quantity = e.target.value;
                            setInvoiceEntries([...invoiceEntries]);
                        }}
                        errorText={errors.quantityError}>
                    </FormInput>
                </td>
                <td className="total">
                    <AdornedFormInput
                        disabled
                        minHelperText
                        fullWidth
                        adornment="$"
                        size="small"
                        type="number"
                        value={total}
                        onChange={() => { }}
                        errorText={errors.quantityError}>
                    </AdornedFormInput>
                </td>
            </tr>
        </>
    )

}

const ChooseItemModal = (props) => {

    const { invoiceEntry, setInvoiceEntries, setChoosingItemType } = props;

    return (
        <motion.div className="fixed-info-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15, delay: 0 }}>
            <div className="fixed-info-modal-container">
                <div className="fixed-info-modal select-item-type-modal">
                    <h4 className="select-item-type-heading py-2">Warning</h4>
                    <p className="select-item-type-quote">
                        Select Item Type Horr
                    </p>
                    <div className="row gx-1">
                        <div className="col-auto">
                            <Button
                                size="large"
                                variant="contained"
                                onClick={() => { }}>
                                <span>Never Mind</span>
                            </Button>
                        </div>
                        <div className="col-auto">
                            <Button
                                color="error"
                                size="large"
                                variant="contained"
                                onClick={() => setChoosingItemType(false)}>
                                <span>Proceed</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

export default CreateInvoicePage;