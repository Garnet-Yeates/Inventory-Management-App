// Used for creating new Item Types

import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { AdornedFormInput, FormInput } from "../../components/FormComponents";
import { newAbortSignal } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";

const CreateItemTypePage = (props) => {

    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode } = props;

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
    useEffect(() => () => signalRef.current?.abort());
    
    const submitForm = async () => {
        signalRef.current?.abort();
        signalRef.current = newAbortSignal(10);

        try {
            let { data } = await axios.get(`${SERVER_URL}/dashboard/navInfo`, { signal: signalRef.current.signal })
            trySelectNode("manageItemTypes")
       //     selectNodeNextRefresh("manageItemTypes");
       //     refreshNavInfo();
        }
        catch (err) {
            if (axios.isCancel(err)) return console.log("Request canceled due to timeout or unmount", err);
            console.log("Error at GET /itemType/createItemType", err);
            if (err.response.data) {
                const { itemNameErrors, itemCodeErrors, itemDescriptionErrors, defaultBuyPriceErrors, defaultSellPriceErrors } = err.response.data;
                setItemNameError(itemNameErrors[0]);
                setItemCodeError(itemCodeErrors[0]);
                setItemDescriptionError(itemDescriptionErrors[0]);
                setDefaultBuyPriceError(defaultBuyPriceErrors[0]);
                setDefaultSellPriceError(defaultSellPriceErrors[0]);
            }
        }

    }

    return (
        <div className="create-item-type-sub-page">
            <h2 className="sub-page-header">
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
                                label="Item Description"
                                maxRows={4}
                                state={itemDescription}
                                setState={setItemDescription}
                                errorText={itemDescriptionError}>
                            </FormInput>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

}

export default CreateItemTypePage;