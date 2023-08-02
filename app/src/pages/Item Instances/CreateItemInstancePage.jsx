// Used for creating new Item Types. No way to edit 'in-progress' ones since creation is very simple

import { useEffect, useRef, useState } from "react";
import { AdornedFormInput, FormInput } from "../../components/FormComponents";
import axios from "axios";
import { effectAbortSignal, newAbortSignal, useUnmountSignalCancel } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";
import { LoadingButton } from "@mui/lab";
import { Send } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers";
import { convertDateFormat } from "../../tools/generalTools";

const CreateItemInstancePage = (props) => {

    // Inherited from dashboard
    const { selectNodeNextRefresh, refreshTreeInfo, tryNavigate, lockExitWith, unlockExit, addDashboardMessage, currURLQuery } = props;

    const { editingId, preSetItemCode } = currURLQuery;

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

    // For the submit button
    const submitSignalRef = useRef(); 
    useUnmountSignalCancel(submitSignalRef);

    // For the "auto item code querying" when item code field changes
    const itemCodeUpdateSignalRef = useRef(); 
    useUnmountSignalCancel(itemCodeUpdateSignalRef);

    // When preSetItemCode query param changes
    useEffect(() => {
        lockExitWith("Unsaved changes will be lost. Are you sure?")
        setItemCode(preSetItemCode ?? "");
    }, [preSetItemCode])

    // When editingId query param changes
    useEffect(() => {

        lockExitWith("Unsaved changes will be lost. Are you sure?")

        if (editingId) {

            const { controller, isCleanedUp, cleanup } = effectAbortSignal(5);
            (async () => {
                try {
                    const { data: { itemInstance } } = await axios.get(`${SERVER_URL}/itemInstance/getItemInstance`, { params: { itemInstanceId: editingId }, signal: controller.signal })
                    console.log("Loaded up the following item instance for editing:", itemInstance)

                    // TODO { $y: year, $M: month, $D: day } format for datepurchased which is returned as a sql string
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
    const itemCodeUpdateDelayRef = useRef(); 
    useEffect(() => {

        if (itemCodeUpdateDelayRef.current) {
            clearTimeout(itemCodeUpdateDelayRef.current);
        }

        itemCodeUpdateSignalRef.current?.abort();
        itemCodeUpdateSignalRef.current = newAbortSignal(10);

        setDefaultBuyPrice("");
        setDefaultSellPrice("");

        itemCodeUpdateDelayRef.current = setTimeout(() => {
            if (itemCode) {
                (async () => {
                    try {
                        const response = await axios.get(`${SERVER_URL}/itemType/getItemType`, { params: { itemCode }, signal: itemCodeUpdateSignalRef.current.signal })
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

            // Right now preSetItemCode is only used when props are overridden by ItemTypeManagement page, so we will redirect back to there in this case
            if (preSetItemCode) {
                tryNavigate({ path: "/itemTypes", replace: true })
            }
            else {
                tryNavigate({ path: "/itemInstances", replace: true })
            }
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
                                value={itemCode}
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
                                value={quantity}
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
                                value={buyPrice}
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
                                value={sellPrice}
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

export default CreateItemInstancePage;