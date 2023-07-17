import axios from "axios";
import { useEffect, useState } from "react";
import { mountAbortSignal } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";
import "../../sass/ManageItemInstancesSubPage.scss"

const ItemInstanceManagementPage = (props) => {

    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    // Props that can exist when props for this page are overriden
    const { editingSpecificItemInstance } = props;

    const passDownProps = {
        selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage,
    }

    return <ItemInstancesView {...passDownProps} />
}

const ItemInstancesView = (props) => {

    // Inherited props
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    const [itemInstances, setItemInstances] = useState([]);

    // Upon mount we use a GET request to get a list of all item instances so we can display them
    useEffect(() => {

        const { controller, isCleanedUp, cleanup } = mountAbortSignal(5);

        (async () => {
            try {
                let response = await axios.get(`${SERVER_URL}/itemInstance/getItemInstances`, { signal: controller.signal })
                console.log("got res", response);
                setItemInstances(response.data.itemInstances);

                let response2 = await axios.get(`${SERVER_URL}/itemInstance/getItemInstances`, { params: { groupByType: true }, signal: controller.signal })
                console.log("got res2", response2);

            }
            catch (err) {
                if (axios.isCancel(err)) return `Request canceled due to ${isCleanedUp() ? "timeout" : "unmount"}`
                console.log("ItemInstancesView: error with API call to: /itemInstance/getItemInstances", err);
            }
        })()

        return cleanup;

    }, []);

    return (
        <div className="item-instance-management-sub-page">
            <h2 className="sub-page-heading">Item Instance Management</h2>
            <div className="item-instances-display-container">
                {itemInstances.map((itemInstance) => <SimpleItemInstanceDisplay
                    key={itemInstance.itemInstanceId}
                    itemInstance={itemInstance}
                    trySelectNode={trySelectNode}
                />)}
            </div>
        </div>
    )
}

export const SimpleItemInstanceDisplay = (props) => {

    const {
        itemInstance: {
            itemTypeId,
            itemInstanceId,
            itemName, // Inner joined from itemType
            itemCode, // Inner joined from itemType
            datePurchased,
            dateAdded,
            quantity,
            buyPrice,
            sellPrice
        },
        trySelectNode,
    } = props;

    return (
        <div className="item-instance-display-container">
            <div className="name-code-group">
                <span className="item-name">
                    {itemName} ({quantity})
                </span>
                <span className="item-code">
                    {itemCode}
                </span>
            </div>
            <span className="date">
                Purchased {datePurchased}
            </span>
            <span className="date">
                Added {dateAdded}
            </span>
            <span className="buy-sell">
                Buy Price: {formatToUSCurrency(buyPrice)} | Sell Price: {formatToUSCurrency(sellPrice)}
            </span>
        </div>
    )
}

function formatToUSCurrency(number) {
    if (!(typeof number === "number")) {
        return "NaN";
    }
    const formattedNumber = number.toFixed(2); // Format the number to have 2 decimal places
    return "$" + formattedNumber; // Add the dollar sign ($) prefix
}

export default ItemInstanceManagementPage;