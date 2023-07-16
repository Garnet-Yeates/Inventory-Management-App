// Used for creating new Item Types. No way to edit 'in-progress' ones since creation is very simple

import { useState } from "react";
import { useNavigate } from "react-router-dom";

const CreateItemInstancePage = (props) => {

    // Inherited from dashboard
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    // Only inherited when composed by ItemTypeManagementPage
    const {
        editingId,
    } = props;

    // Page-specific props
    const { preSetItemTypeId, preSetItemCode } = props;

    // This is the one that is internally used when it is created
    const [itemTypeId, setItemTypeId] = useState(preSetItemTypeId);

    // This is the one you visibly see. When editing, and also when preSetItemTypeId is set, this should be disabled
    const [itemCode, setItemCode] = useState(preSetItemCode);

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

    // Abort the submit button signal if we happen to unmount
    const submitSignalRef = useRef();
    useEffect(() => () => submitSignalRef.current?.abort(), []);

    // Whenever itemTypeId changes (or mount occurs), we see find the itemType to load its default values into our placeholders 
    useEffect(() => {

        if (itemTypeId) {

            const { controller, isCleanedUp, cleanup } = mountAbortSignal(5);
            (async () => {
                try {
                    const { data: { itemType } } = await axios.get(`${SERVER_URL}/itemType/getItemType`, { params: { itemTypeId }, signal: controller.signal })
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
    }, [itemTypeId])

    // Whenever editingId changes (or mount occurs), we lock exit for unsaved data warning, and we also load up the data if we are editing
    useEffect(() => {

        lockExitWith("Unsaved changes will be lost. Are you sure?")

        if (editingId) {

            const { controller, isCleanedUp, cleanup } = mountAbortSignal(5);
            (async () => {
                try {
                    const { data: { itemInstance } } = await axios.get(`${SERVER_URL}/itemType/getItemInstance`, { params: { itemInstanceId: editingId }, signal: controller.signal })
                    console.log("Loaded up the following item instance for editing:", itemInstance)

                    setDatePurchased(itemInstance.datePurchased);
                    setItemCode(itemInstance.itemCode); // Table is inner joined
                    setItemTypeId(itemInstance.itemTypeId); // Table is inner joined
                    setQuantity(itemInstance.quantity);
                    setBuyPrice(itemInstance.buyPrice);
                    setSellPrice(itemInstance.sellPrice);
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
            const postData = {
                itemTypeId,
                datePurchased,
                quantity,
                buyPrice: buyPrice ? parseFloat(buyPrice) : undefined,
                sellPrice: sellPrice ? parseFloat(sellPrice) : undefined,
            }

            if (!editingId) {
                await axios.post(`${SERVER_URL}/itemType/createItemInstance`, postData, config);
            }
            else {
                postData.itemInstanceId = editingId;
                await axios.put(`${SERVER_URL}/itemType/updateItemInstance`, postData, config);
            }

            unlockExit();
            addDashboardMessage("itemInstanceSuccess", { type: "success", text: `Item Instance has been successfully ${editingId ? "updated" : "created"}` })
            trySelectNode("manageItemInstances", { programmatic: true })
        }
        catch (err) {
            console.log("Error creating or updating item instance", err);
            if (axios.isCancel(err)) return console.log("Request canceled due to timeout or unmount", err);
            
            // Validation errors
            if (err.response?.data) {
                const {
                    itemNameError,
                    itemDescriptionError,
                    buyPriceError,
                    sellPriceError,
                } = err.response.data;
                setDatePurchasedError((itemNameError));
                setQuantityError((itemDescriptionError));
                setBuyPriceError((buyPriceError));
                setSellPriceError((sellPriceError));
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
                                state={datePurchased}
                                setState={setDatePurchased}
                                errorText={datePurchasedError}>
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
                                label="Default Sell Price"
                                state={sellPrice}
                                setState={setSellPrice}
                                errorText={sellPriceError}>
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
                                state={quantity}
                                setState={setQuantity}
                                errorText={quantityError}>
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

export default CreateItemInstancePage;