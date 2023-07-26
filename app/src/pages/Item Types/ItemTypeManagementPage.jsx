import axios from "axios";
import { useEffect, useState } from "react";
import { mountAbortSignal } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";
import "../../sass/ManageItemTypesSubPage.scss"
import { Button } from "@mui/material";
import { Add, Edit, Visibility } from "@mui/icons-material";
import CreateItemTypePage from "./CreateItemTypePage";

const ItemTypeManagementPage = (props) => {

    // Inherited props
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    // Props that can exist when props for this page are overriden
    const { viewingSpecificItemType, editingSpecificItemType } = props;

    const passDownProps = {
        selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage,
        viewingSpecificItemType,
        editingSpecificItemType,
    }

    if (viewingSpecificItemType) {
        return <ViewItemTypePage itemTypeId={viewingSpecificItemType} {...passDownProps} />
    }

    if (editingSpecificItemType) {
        return <CreateItemTypePage editingId={editingSpecificItemType} {...passDownProps} />
    }

    return <ItemsViewPage {...passDownProps} />
}

const ItemsViewPage = (props) => {

    // Inherited props
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    const [itemTypes, setItemTypes] = useState([]);

    // Upon mount we use a GET request to get a list of all item types so we can display them
    useEffect(() => {

        const { controller, isCleanedUp, cleanup } = mountAbortSignal(5);

        (async () => {
            try {
                let response = await axios.get(`${SERVER_URL}/itemType/getItemTypes`, { signal: controller.signal })
                console.log("got res", response);
                setItemTypes(response.data.itemTypes);
            }
            catch (err) {
                if (axios.isCancel(err)) return `Request canceled due to ${isCleanedUp() ? "timeout" : "unmount"}`
                console.log("Error at GET /itemType/getItemTypes", err);
            }
        })()

        return cleanup;

    }, []);

    return (
        <div className="item-type-management-sub-page">
            <h2 className="sub-page-heading">Item Type Management</h2>
            <div className="item-types-display-container">
                {itemTypes.map((itemType) => <SimpleItemTypeDisplay
                    key={itemType.itemCode}
                    itemType={itemType}
                    trySelectNode={trySelectNode}
                />)}
            </div>
        </div>
    )
}

const ViewItemTypePage = (props) => {

    // Inherited props
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    // Specific props
    const { itemTypeId } = props;

    return <div>What a view</div>

}

export const SimpleItemTypeDisplay = (props) => {

    const {
        itemType: {
            itemTypeId,
            itemCode,
            itemCodeIdentifier,
            itemName,
            itemDescription,
            defaultBuyPrice,
            defaultSellPrice,
        },
        trySelectNode,
    } = props;

    return (
        <div className="item-type-display-container">
            <div className="name-code-group">
                <span className="item-name">
                    {itemName}
                </span>
                <span className="item-code">
                    {itemCode}
                </span>
            </div>
            <p className="item-description">
                {itemDescription || "No Description Provided"}
            </p>
            <span className="buy-sell">
                Buy Price: {formatToUSCurrency(defaultBuyPrice)} | Sell Price: {formatToUSCurrency(defaultSellPrice)}
            </span>
            <div className="button-group Mui-ButtonCompression">
                <Button
                    size="small"
                    color="success"
                    onClick={() => {
                        trySelectNode("createNewItemInstance", {
                            programmatic: true,
                            overrideProps: {
                                preSetItemCode: itemCode,
                            }
                        })
                    }}
                    endIcon={<Add />}
                    variant="contained">
                    <span>New</span>
                </Button>
                <Button
                    size="small"
                    color="primary"
                    onClick={() => {
                        trySelectNode("manageItemTypes", {
                            programmatic: true,
                            overrideProps: {
                                editingSpecificItemType: itemTypeId,
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

function formatToUSCurrency(number) {
    const formattedNumber = number.toFixed(2); // Format the number to have 2 decimal places
    return "$" + formattedNumber; // Add the dollar sign ($) prefix
}

export default ItemTypeManagementPage;