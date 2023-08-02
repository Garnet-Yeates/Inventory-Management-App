// Used for creating new Item Types

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { AdornedFormInput, FormInput } from "../../components/FormComponents";
import { effectAbortSignal, newAbortSignal } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";
import { LoadingButton } from "@mui/lab";
import { Send as SendIcon } from "@mui/icons-material";
import "../../sass/CreateItemTypeSubPage.scss"

const CreateItemTypePage = (props) => {

    // Inherited props from dashboard
    const { selectNodeNextRefresh, refreshNavInfo, tryNavigate, lockExitWith, unlockExit, addDashboardMessage } = props;

    // Override prop, only inherited when composed by ItemTypeManagementPage
    const { editingId } = props;

    const [itemName, setItemName] = useState("")
    const [itemNameError, setItemNameError] = useState("");

    const [itemCode, setItemCode] = useState("")
    const [itemCodeError, setItemCodeError] = useState("");

    const [itemDescription, setItemDescription] = useState("")
    const [itemDescriptionError, setItemDescriptionError] = useState("")

    const [defaultBuyPrice, setDefaultBuyPrice] = useState("");
    const [defaultBuyPriceError, setDefaultBuyPriceError] = useState("")

    const [defaultSellPrice, setDefaultSellPrice] = useState("");
    const [defaultSellPriceError, setDefaultSellPriceError] = useState("")

    const submitSignalRef = useRef();

    // This effect does nothing except return a cleanup (on unmount essentially) function that will abort the current controller
    useEffect(() => () => submitSignalRef.current?.abort(), []);

    useEffect(() => {

        lockExitWith("Unsaved changes will be lost. Are you sure?")

        if (editingId) {

            const { controller, isCleanedUp, cleanup } = effectAbortSignal(5);

            (async () => {
                try {
                    const { data: { itemType } } = await axios.get(`${SERVER_URL}/itemType/getItemType`, { params: { itemTypeId: editingId }, signal: controller.signal  })
                    console.log("Loaded up the following item type for editing:", itemType)

                    setItemName(itemType.itemName);
                    setItemCode(itemType.itemCode);
                    setItemDescription(itemType.itemDescription);
                    setDefaultBuyPrice(itemType.defaultBuyPrice);
                    setDefaultSellPrice(itemType.defaultSellPrice);
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

    const submitForm = async () => {

        setLoading(true);
        submitSignalRef.current?.abort();
        submitSignalRef.current = newAbortSignal(10);

        try {
            const config = { signal: submitSignalRef.current.signal };
            const data = {
                itemName,
                itemCode,
                itemDescription,
                defaultBuyPrice: defaultBuyPrice ? parseFloat(defaultBuyPrice) : undefined,
                defaultSellPrice: defaultSellPrice ? parseFloat(defaultSellPrice) : undefined,
            }

            if (!editingId) {
                await axios.post(`${SERVER_URL}/itemType/createItemType`, data, config);
            }
            else {
                data.itemTypeId = editingId;
                await axios.put(`${SERVER_URL}/itemType/updateItemType`, data, config);
            }

            unlockExit();
            addDashboardMessage("itemTypeSuccess", { type: "success", text: `Item Type has been successfully ${editingId ? "updated" : "created"}` })
            tryNavigate({ path: "/itemTypes" })
            refreshNavInfo();
        }
        catch (err) {
            console.log("Error creating or updating item type", err);
            if (axios.isCancel(err)) return console.log("Request canceled due to timeout or unmount", err);
            
            // Validation errors
            if (err.response?.data) {
                const {
                    itemNameError,
                    itemCodeError,
                    itemDescriptionError,
                    defaultBuyPriceError,
                    defaultSellPriceError
                } = err.response.data;
                setItemNameError((itemNameError));
                setItemCodeError((itemCodeError));
                setItemDescriptionError((itemDescriptionError));
                setDefaultBuyPriceError((defaultBuyPriceError));
                setDefaultSellPriceError((defaultSellPriceError));
            }
        }
        finally {
            setLoading(false)
        }
    }

    return (
        <div className="create-item-type-sub-page">
            <h2 className="sub-page-heading">
                {editingId ? "Edit" : "Create New"} Item Type
            </h2>
            <div className="create-item-type-form">
                <div className="row gx-0">
                    <div className="col-lg-6">
                        <div className="form-control">
                            <FormInput
                                fullWidth
                                label="Item Name"
                                value={itemName}
                                setState={setItemName}
                                errorText={itemNameError}>
                            </FormInput>
                        </div>
                        <div className="form-control">
                            <FormInput
                                fullWidth
                                label="Item Code"
                                value={itemCode}
                                setState={setItemCode}
                                errorText={itemCodeError}>
                            </FormInput>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="form-control">
                            <AdornedFormInput
                                fullWidth
                                type="number"
                                adornment="$"
                                label="Default Buy Price"
                                value={defaultBuyPrice}
                                setState={setDefaultBuyPrice}
                                errorText={defaultBuyPriceError}>
                            </AdornedFormInput>
                        </div>
                        <div className="form-control">
                            <AdornedFormInput
                                fullWidth
                                type="number"
                                adornment="$"
                                label="Default Sell Price"
                                value={defaultSellPrice}
                                setState={setDefaultSellPrice}
                                errorText={defaultSellPriceError}>
                            </AdornedFormInput>
                        </div>
                    </div>
                    <div className="col">
                        <div className="form-control">
                            <FormInput
                                fullWidth
                                multiline
                                rows={4}
                                label="Item Description"
                                value={itemDescription}
                                setState={setItemDescription}
                                errorText={itemDescriptionError}>
                            </FormInput>
                        </div>
                    </div>
                </div>
                <div className="form-control">
                    <LoadingButton
                        fullWidth
                        size="large"
                        onClick={submitForm}
                        endIcon={<SendIcon />}
                        loading={loading}
                        loadingPosition="end"
                        variant="contained">
                        <span>{editingId ? "Edit" : "Create"} Item Type</span>
                    </LoadingButton>
                </div>
            </div>
        </div>
    )
}

export default CreateItemTypePage;