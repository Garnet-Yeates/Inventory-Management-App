// Used for creating new Item Types. No way to edit 'in-progress' ones since creation is very simple

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdornedFormInput, FormInput } from "../../components/FormComponents";
import axios from "axios";
import { mountAbortSignal, newAbortSignal } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";
import { LoadingButton } from "@mui/lab";
import { Send } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers";
import { TextField } from "@mui/material";

const CreateItemInstancePage = (props) => {

    // Inherited from dashboard
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    // Only inherited when composed by ItemTypeManagementPage
    const {
        editingId,
    } = props;

    // Page-specific props
    const { preSetItemCode } = props;

    // For now we change it by typing. Every time it changes it makes a GET though.. Later this will be done through a modal with search abilities
    const [itemCode, setItemCode] = useState("");
    const [itemCodeError, setItemCodeError] = useState("");

    const [datePurchased, setDatePurchased] = useState("")
    const [datePurchasedError, setDatePurchasedError] = useState("");

    const [quantity, setQuantity] = useState("")
    const [quantityError, setQuantityError] = useState("")

    const [buyPrice, setBuyPrice] = useState("");
    const [buyPriceError, setBuyPriceError] = useState("")
    const [defaultBuyPrice, setDefaultBuyPrice] = useState("")

    const [sellPrice, setSellPrice] = useState("");
    const [sellPriceError, setSellPriceError] = useState("")
    const [defaultSellPrice, setDefaultSellPrice] = useState("")

    // Abort signals on unmount
    const submitSignalRef = useRef(); // Submit button
    const codeUpdateSignalRef = useRef(); // setTimeOut after itemCode changes
    useEffect(() => {
        return function cleanup() { 
            codeUpdateSignalRef.current?.abort();
            submitSignalRef.current?.abort();
        }
     }, []);

    // We also run this when preSetItemCode (override prop) changes, because they can click on the node again to re-select it and remove the overriden prop
    useEffect(() => {
        lockExitWith("Unsaved changes will be lost. Are you sure?")
        setItemCode(preSetItemCode ?? "");
    }, [preSetItemCode])

    // Whenever editingId changes (or mount occurs), we lock exit for unsaved data warning, and we also load up the data if we are editing
    useEffect(() => {

        console.log("E2")

        lockExitWith("Unsaved changes will be lost. Are you sure?")

        if (editingId) {

            const { controller, isCleanedUp, cleanup } = mountAbortSignal(5);
            (async () => {
                try {
                    const { data: { itemInstance } } = await axios.get(`${SERVER_URL}/itemInstance/getItemInstance`, { params: { itemInstanceId: editingId }, signal: controller.signal })
                    console.log("Loaded up the following item instance for editing:", itemInstance)

                    setDatePurchased(itemInstance.datePurchased);
                    setItemCode(itemInstance.itemCode); // Table is inner joined
                    setQuantity(itemInstance.quantity);
                    setBuyPrice(itemInstance.buyPrice);
                    setSellPrice(itemInstance.sellPrice);
                }
                catch (err) {
                    if (axios.isCancel(err)) return `Request canceled due to ${isCleanedUp() ? "timeout" : "cleanup"}`
                    console.log("Error at GET /itemInstance/getItemInstance", err);
                }
            })()

            return cleanup;
        }
    }, [editingId])

    // Whenever itemCode changes (or mount occurs), we try to find the itemType to load its default values into our placeholders 
    const itemCodeUpdateDelayRef = useRef(); // For now this happens via typing in the field and we must throttle it. Later it will have a search modal
    // Request sent 250ms after changing them code. If it changes again before timeout occurs, previous timeout is canceled and it will try again in 200ms
    // Cookie/header race conditions...
    useEffect(() => {

        if (itemCodeUpdateDelayRef.current) {
            clearTimeout(itemCodeUpdateDelayRef.current);
        }

        codeUpdateSignalRef.current?.abort();
        codeUpdateSignalRef.current = newAbortSignal(10);

        setDefaultBuyPrice("");
        setDefaultSellPrice("");

        itemCodeUpdateDelayRef.current = setTimeout(() => {
            if (itemCode) {
                (async () => {
                    try {
                        const response = await axios.get(`${SERVER_URL}/itemType/getItemType`, { params: { itemCode }, signal: codeUpdateSignalRef.current.signal })
                        const { data: { itemType } }  = response;
                        console.log("Received the following from the server", response)
                        setDefaultBuyPrice(itemType.defaultBuyPrice);
                        setDefaultSellPrice(itemType.defaultSellPrice);
                    }
                    catch (err) {
                        if (axios.isCancel(err)) return `Request canceled due to unmount or consecutive call (cancels previous request)`
                        console.log("Error at GET /itemType/getItemType", err);
                    }
                })()
            }
        }, 250)
    }, [itemCode])

    const [loading, setLoading] = useState(false);

    const submitForm = async () => {

        setLoading(true);
        submitSignalRef.current?.abort();
        submitSignalRef.current = newAbortSignal(10);

        const { $y: year, $M: month, $D: day } = datePurchased;

        try {
            const config = { signal: submitSignalRef.current.signal };
            const data = {
                itemCode,
                datePurchased: convertDateFormat(month, day, year),
                quantity: parseInt(quantity),
                buyPrice: buyPrice ? parseFloat(buyPrice) : undefined,
                sellPrice: sellPrice ? parseFloat(sellPrice) : undefined,
            }

            if (!editingId) {
                await axios.post(`${SERVER_URL}/itemInstance/createItemInstance`, data, config);
            }
            else {
                data.itemInstanceId = editingId;
                await axios.put(`${SERVER_URL}/itemInstance/updateItemInstance`, data, config);
            }

            unlockExit();
            addDashboardMessage("itemInstanceSuccess", { type: "success", text: `Item Instance has been successfully ${editingId ? "updated" : "created"}` })
            trySelectNode("manageItemInstances", { programmatic: true })
        }
        catch (err) {
            console.log("Error creating or updating item instance", err);
            if (axios.isCancel(err)) return console.log("Request canceled due to unmount consecutive call (cancels prev request)", err);

            // Validation errors
            if (err.response?.data) {
                const {
                    quantityError,
                    datePurchasedError,
                    itemCodeError,
                    buyPriceError,
                    sellPriceError,
                } = err.response.data;
                setDatePurchasedError(datePurchasedError);
                setItemCodeError(itemCodeError);
                setQuantityError(quantityError);
                setBuyPriceError(buyPriceError);
                setSellPriceError(sellPriceError);
            }
        }
        finally {
            setLoading(false)
        }
    }

    return (
        <div className="create-item-type-sub-page">
            <h2 className="sub-page-heading">
                {editingId ? "Edit" : "Create New"} Item Instance
            </h2>
            <div className="create-item-type-form">
                <div className="row gx-0">
                    <div className="col-12">
                        <div className="form-control">
                            <FormInput
                                fullWidth
                                disabled={preSetItemCode ? true : false}
                                label="Item Code"
                                state={itemCode}
                                errorText={itemCodeError}
                                setState={setItemCode}>
                            </FormInput>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="form-control">
                            <FormInput
                                fullWidth
                                type="integer"
                                label="Quantity"
                                state={quantity}
                                setState={setQuantity}
                                errorText={quantityError}>
                            </FormInput>
                        </div>
                        <div className="form-control">
                            <DatePicker
                                value={datePurchased}
                                onChange={(newValue) => setDatePurchased(newValue)}
                                fullWidth
                                label="Date Purchased"
                                slotProps={{ textField: { variant: 'outlined', fullWidth: true, error: datePurchasedError ? true : false, helperText: datePurchasedError || " " } }}>
                            </DatePicker>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="form-control">
                            <AdornedFormInput
                                fullWidth
                                type="number"
                                adornment="$"
                                label="Buy Price"
                                placeholder={String(defaultBuyPrice)}
                                state={buyPrice}
                                setState={setBuyPrice}
                                errorText={buyPriceError}>
                            </AdornedFormInput>
                        </div>
                        <div className="form-control">
                            <AdornedFormInput
                                fullWidth
                                type="number"
                                adornment="$"
                                label="Sell Price"
                                placeholder={String(defaultSellPrice)}
                                state={sellPrice}
                                setState={setSellPrice}
                                errorText={sellPriceError}>
                            </AdornedFormInput>
                        </div>
                    </div>
                </div>
                <div className="form-control">
                    <LoadingButton
                        fullWidth
                        size="large"
                        onClick={submitForm}
                        endIcon={<Send />}
                        loading={loading}
                        loadingPosition="end"
                        variant="contained">
                        <span>{editingId ? "Edit" : "Create"} Item Instance</span>
                    </LoadingButton>
                </div>
            </div>
        </div >
    )

}

function convertDateFormat(month, day, year) {
    if (!month || !day || !year)
        return;
    const paddedMonth = String(Number(month) + 1).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
  
    const formattedDate = `${year}-${paddedMonth}-${paddedDay}`;
    return formattedDate;
}

export default CreateItemInstancePage;