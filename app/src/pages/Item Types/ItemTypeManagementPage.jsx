import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { effectAbortSignal } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";
import "../../sass/ItemTypeManagement.scss"
import { Button } from "@mui/material";
import { Add, AddOutlined, Edit, EditOutlined, Visibility, VisibilityOutlined } from "@mui/icons-material";
import CreateItemTypePage from "./CreateItemTypePage";
import { formatToUSCurrency } from "../../tools/generalTools";
import { FormInput, FormSelectInput } from "../../components/FormComponents";

const ItemTypeManagementPage = (props) => {

    // Inherited props
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    // Props that can exist when props for this page are overriden
    const { viewingSpecificItemType, editingSpecificItemType } = props;

    const passDownProps = {
        selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage,
    }

    if (viewingSpecificItemType) {
        return <ViewItemTypePage itemTypeId={viewingSpecificItemType} {...passDownProps} />
    }

    if (editingSpecificItemType) {
        return <CreateItemTypePage editingId={editingSpecificItemType} {...passDownProps} />
    }

    return <ItemsView {...passDownProps} />
}

const ItemsView = (props) => {

    // Inherited props
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    // Loaded upon mount
    const [itemTypes, setItemTypes] = useState([]);
    const [loaded, setLoaded] = useState(false);

    // Upon mount we use a GET request to get a list of all item types so we can display them
    useEffect(() => {

        const { controller, isCleanedUp, cleanup } = effectAbortSignal(5);

        (async () => {
            try {
                let response = await axios.get(`${SERVER_URL}/itemType/getItemTypes`, { signal: controller.signal })
                console.log("ItemsView mount GET /itemType/getItemTypes", response);
                setItemTypes(response.data.itemTypes);
            }
            catch (err) {
                if (axios.isCancel(err)) return `Request canceled due to ${isCleanedUp() ? "timeout" : "unmount"}`
                console.log("Error ItemsView mount GET /itemType/getItemTypes", err);
            }
            finally {
                setLoaded(true);
            }
        })()

        return cleanup;

    }, []);

    // Filtering controls. currentSearch is what the user modifies, currentSearchInternal eventually gets changed but is throttled
    const [currentSearchInternal, setCurrentSearchInternal] = useState("");
    const [currentSearch, setCurrentSearch] = useState("");
    const [filterBy, setFilterBy] = useState("Item Name");
    const [filterType, setFilterType] = useState("Any");

    // When currentSearch changes, 0.5 seconds later we will update currentSearchInternal
    const currentSearchUpdateThrottleRef = useRef();
    useEffect(() => {

        if (currentSearchUpdateThrottleRef.current) {
            clearTimeout(currentSearchUpdateThrottleRef.current);
        }

        currentSearchUpdateThrottleRef.current = setTimeout(() => {
            setCurrentSearchInternal(currentSearch);
        }, 500)

    }, [currentSearch])

    // This memo only updates when state variables update, so when it updates it is always accompanied by a re-render
    const filteredTypes = useMemo(() => {

        if (!currentSearchInternal) {
            return [...itemTypes];
        }

        return itemTypes.filter(type => {

            let applyingFilterTo;
            switch (filterBy) {
                case "Item Code":
                    applyingFilterTo = type.itemCode.toLowerCase();
                    break;
                case "Item Name":
                default:
                    applyingFilterTo = type.itemName.toLowerCase();
                    break;
            }

            const keywords = currentSearchInternal.split(" ").map(word => word.toLowerCase());
            switch (filterType) {
                case "Exact":
                    return applyingFilterTo === currentSearchInternal;
                case "All":
                    for (let word of keywords)
                        if (!applyingFilterTo.includes(word))
                            return false;
                    return true;
                case "Any":
                default:
                    for (let word of keywords)
                        if (applyingFilterTo.includes(word))
                            return true;
                    return false;
            }
        })

    }, [filterBy, filterType, currentSearchInternal, itemTypes])

    let noneJsx;
    if (itemTypes.length === 0) {
        noneJsx = <h3 className="text-center pt-3"><em>No Item Types Yet</em></h3>
    }
    else if (filteredTypes.length === 0) {
        noneJsx = <h3 className="text-center pt-3"><em>No Results Found</em></h3>
    }

    noneJsx = loaded && noneJsx; // Don't display noneJsx unless our initial GET request is done. This is so it doesn't show 'None Yet' heading when in reality we don't know yet

    return (
        <div className="item-type-management-sub-page">
            <h2 className="sub-page-heading">Item Type Management</h2>
            <ItemTypeFilter
                currentSearch={currentSearch} setCurrentSearch={setCurrentSearch}
                filterBy={filterBy} setFilterBy={setFilterBy}
                filterType={filterType} setFilterType={setFilterType}>
            </ItemTypeFilter>
            {loaded && noneJsx}
            <div className="item-types-display-container">
                {filteredTypes.map((itemType) => <SimpleItemTypeDisplay
                    key={itemType.itemCode}
                    itemType={itemType}
                    trySelectNode={trySelectNode}
                />)}
            </div>
        </div>
    )
}

export const ItemTypeFilter = (props) => {

    const { currentSearch, setCurrentSearch, filterBy, setFilterBy, filterType, setFilterType } = props;

    return (
        <div className="item-instance-filtering-container">
            <div className="search-bar">
                <FormInput
                    minHelperText
                    fullWidth
                    label="Filter Query"
                    value={currentSearch}
                    setState={setCurrentSearch}>
                </FormInput>
            </div>
            <div className="filter-by">
                <FormSelectInput
                    minHelperText
                    fullWidth
                    value={filterBy}
                    setState={setFilterBy}
                    values={["Item Name", "Item Code"]}
                    label="Filter By">
                </FormSelectInput>
            </div>
            <div className="filter-type">
                <FormSelectInput
                    minHelperText
                    fullWidth
                    value={filterType}
                    displayToValueMap={{ "Includes Any": "Any", "Includes All": "All", "Exact Match": "Exact" }}
                    setState={setFilterType}
                    label="Filter Type">
                </FormSelectInput>
            </div>
        </div>
    )
}

const ViewItemTypePage = (props) => {

    // Inherited props
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    // Specific props (overridden)
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
                    endIcon={<AddOutlined />}
                    variant="outlined">
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
                    endIcon={<EditOutlined />}
                    variant="outlined">
                    <span>Edit</span>
                </Button>
                <Button
                    size="small"
                    color="secondary"
                    onClick={() => {
                        trySelectNode("manageItemInstances", {
                            programmatic: true,
                            overrideProps: {
                                viewingInstancesOf: itemCode,
                            }
                        })
                    }}
                    endIcon={<VisibilityOutlined />}
                    variant="outlined">
                    <span>View Instances</span>
                </Button>
            </div>
        </div>
    )
}

export default ItemTypeManagementPage;