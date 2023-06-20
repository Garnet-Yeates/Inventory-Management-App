// Used for creating new Item Types

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { AdornedFormInput, FormInput } from "../../components/FormComponents";
import { newAbortSignal } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";
import { LoadingButton } from "@mui/lab";
import { Send as SendIcon } from "@mui/icons-material";
import "../../sass/CreateItemTypeSubPage.scss"

const CreateItemTypePage = (props) => {

    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

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

    const signalRef = useRef();

    // This effect does nothing except return a cleanup (on unmount essentially) function that will abort the current controller
    useEffect(() => () => signalRef.current?.abort(), []);

    // On mount we lock page switching with a warning that their item won't be saved
    useEffect(() => void lockExitWith("This item has not been saved yet. Are you sure?"))

    const [loading, setLoading] = useState(false);
    
    const submitForm = async () => {

        setLoading(true);
        signalRef.current?.abort();
        signalRef.current = newAbortSignal(10);

        try {
            const config = { signal: signalRef.current.signal };
            const postData = {
                itemName,
                itemCode,
                itemDescription,
                defaultBuyPrice: defaultBuyPrice ? parseFloat(defaultBuyPrice) : undefined,
                defaultSellPrice: defaultSellPrice ? parseFloat(defaultSellPrice) : undefined,
            }
            await axios.post(`${SERVER_URL}/itemType/createItemType`, postData, config);
            unlockExit();
            addDashboardMessage("itemTypeCreationSuccess", { type: "success", text: "Item Type has been successfully created" })
            trySelectNode("manageItemTypes")

        }
        catch (err) {
            if (axios.isCancel(err)) return console.log("Request canceled due to timeout or unmount", err);
            console.log("Error at GET /itemType/createItemType", err);
            if (err.response.data) {
                const { itemNameErrors, itemCodeErrors, itemDescriptionErrors, defaultBuyPriceErrors, defaultSellPriceErrors } = err.response.data;
                setItemNameError((itemNameErrors ?? [])[0]);
                setItemCodeError((itemCodeErrors ?? [])[0]);
                setItemDescriptionError((itemDescriptionErrors ?? [])[0]);
                setDefaultBuyPriceError((defaultBuyPriceErrors ?? [])[0]);
                setDefaultSellPriceError((defaultSellPriceErrors ?? [])[0]);
            }
        }
        finally {
            setLoading(false)
        }
    }

    return (
        <div className="create-item-type-sub-page">
            <h2 className="sub-page-heading">
                Create New Item Type
            </h2>
            <div className="create-item-type-form">
                <div className="row gx-0">
                    <div className="col-lg-6">
                        <div className="form-control">
                            <FormInput
                                fullWidth
                                label="Item Name"
                                state={itemName}
                                setState={setItemName}
                                errorText={itemNameError}>
                            </FormInput>
                        </div>
                        <div className="form-control">
                            <FormInput
                                fullWidth
                                label="Item Code"
                                state={itemCode}
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
                                state={defaultBuyPrice}
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
                                state={defaultSellPrice}
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
                                state={itemDescription}
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
                        <span>Create Item Type</span>
                    </LoadingButton>
                </div>
            </div>
        </div>
    )
}

export default CreateItemTypePage;