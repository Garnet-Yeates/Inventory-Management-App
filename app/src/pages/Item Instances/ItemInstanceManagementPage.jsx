import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { effectAbortSignal } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";
import "../../sass/ItemInstanceManagement.scss"
import { formatToUSCurrency } from "../../tools/generalTools";
import { FormInput, FormSelectInput } from "../../components/FormComponents";
import { Button } from "@mui/material";
import CreateItemInstancePage from "./CreateItemInstancePage";

const ItemInstanceManagementPage = (props) => {

    // When overriden by this page itself
    const { editingSpecificItemInstance } = props;

    if (editingSpecificItemInstance) {
        return <CreateItemInstancePage editingId={editingSpecificItemInstance} {...props} />
    }

    return <ItemInstancesView {...props} />
}

const ItemInstancesView = (props) => {

    // Inherited props from Dashboard
    const { selectNodeNextRefresh, refreshNavInfo, tryNavigate, lockExitWith, unlockExit, addDashboardMessage } = props;

    // If overridden by ItemTypeManagementPage
    const { viewingInstancesOf, backToTypes } = props;

    // General overrides
    const { preSetFilterBy, preSetFilterType, preSetFilterQuery } = props;

    // Loaded upon mount
    const [itemInstanceGroups, setItemInstanceGroups] = useState([]);
    const [loaded, setLoaded] = useState(false);

    // Upon mount we use a GET request to get a list of all item instances so we can display them
    useEffect(() => {

        const { controller, isCleanedUp, cleanup } = effectAbortSignal(5);

        (async () => {
            try {
                let response = await axios.get(`${SERVER_URL}/itemInstance/getItemInstances`, { params: { groupByType: true }, signal: controller.signal })
                setItemInstanceGroups(response.data.itemInstanceGroups)
                console.log("ItemInstancesView mount GET /itemInstance/getItemInstances?groupByType=true", response);

            }
            catch (err) {
                if (axios.isCancel(err)) return `Request canceled due to ${isCleanedUp() ? "timeout" : "unmount"}`
                console.log("Error ItemsView mount GET /itemInstance/getItemInstances", err);
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

    useEffect(() => {
        setCurrentSearchInternal(preSetFilterQuery ?? "");
        setCurrentSearch(preSetFilterQuery ?? "");
        setFilterBy(preSetFilterBy ?? "Item Name")
        setFilterType(preSetFilterType ?? "Any")
    }, [preSetFilterBy, preSetFilterType, preSetFilterQuery])

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
    const filteredGroups = useMemo(() => {

        if (!currentSearchInternal) {
            return [...itemInstanceGroups];
        }

        return itemInstanceGroups.filter(group => {

            let applyingFilterTo;
            switch (filterBy) {
                case "Item Code":
                    applyingFilterTo = group.itemCode.toLowerCase();
                    break;
                case "Item Name":
                default:
                    applyingFilterTo = group.itemName.toLowerCase();
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

    }, [filterBy, filterType, currentSearchInternal, itemInstanceGroups])

    const heading = viewingInstancesOf ?
        (<h2 className="sub-page-heading">Instances of <span className="item-code-heading">{viewingInstancesOf}</span></h2>) :
        (<h2 className="sub-page-heading">Item Instance Management</h2>)

    let createJsx = (
        <div className="management-create-button-container">
            <Button
                fullWidth
                size="large"
                color="success"
                variant="contained"
                onClick={() => {
                    tryNavigate({
                        path: "/itemInstances",
                        overrideProps: !viewingInstancesOf ? undefined : ({
                            preSetItemCode: viewingInstancesOf,
                        })
                    })
                }}>
                <span>{viewingInstancesOf ? `Create New ${viewingInstancesOf}` : `Create New Item Instance`}</span>
            </Button>
        </div>
    )

    let noneJsx;
    if (itemInstanceGroups.length === 0) {
        noneJsx = <h3 className="text-center pt-3"><em>No Item Instances Yet</em></h3>
    }
    else if (filteredGroups.length === 0) {
        noneJsx = <h3 className="text-center pt-3"><em>No Results Found</em></h3>
    }

    if (noneJsx && viewingInstancesOf) {
        noneJsx = <h3 className="text-center pt-3"><em>There are no instances of this Item</em></h3>
    }

    noneJsx = loaded && noneJsx; // Don't display noneJsx unless our initial GET request is done. This is so it doesn't show 'None Yet' heading when in reality we don't know yet

    return (
        <div className="item-instance-management-sub-page">
            {backToTypes && <div className="d-flex justify-content-between pb-3">
                <Button
                    variant="text"
                    size="medium"
                    color="primary"
                    onClick={() => {
                        tryNavigate({
                            path: "/itemTypes",
                            state: {
                                overrideProps: { ...backToTypes }
                            }
                        })
                    }}>
                    <span>Back To Types</span>
                </Button>
                <Button
                    variant="text"
                    size="medium"
                    color="primary"
                    onClick={() => {
                        tryNavigate({ path: "/itemInstances" })
                    }}>
                    <span>Instance Management</span>
                </Button>
            </div>}
            {heading}
            <ItemInstanceFilter
                viewingInstancesOf={viewingInstancesOf}
                currentSearch={currentSearch} setCurrentSearch={setCurrentSearch}
                filterBy={filterBy} setFilterBy={setFilterBy}
                filterType={filterType} setFilterType={setFilterType}>
            </ItemInstanceFilter>
            {createJsx}
            {noneJsx}
            <div className="item-instance-groups-display-container">
                {filteredGroups.map((instanceGroup) =>
                    <ItemInstanceGroup
                        key={instanceGroup.itemTypeId}
                        viewingInstancesOf={viewingInstancesOf}
                        {...instanceGroup}>
                    </ItemInstanceGroup>
                )}
            </div>
        </div>
    )
}

export const ItemInstanceFilter = (props) => {

    // Normal properties
    const { currentSearch, setCurrentSearch, filterBy, setFilterBy, filterType, setFilterType } = props;

    // If overridden by ItemTypeManagementPage
    const { viewingInstancesOf } = props;

    const disabled = viewingInstancesOf !== undefined && viewingInstancesOf !== null;

    return (
        <div className="management-filtering-container">
            <div className="search-bar">
                <FormInput
                    disabled={disabled}
                    minHelperText
                    fullWidth
                    label="Filter Query"
                    value={currentSearch}
                    setState={setCurrentSearch}>
                </FormInput>
            </div>
            <div className="filter-by">
                <FormSelectInput
                    disabled={disabled}
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
                    disabled={disabled}
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

export const ItemInstanceGroup = (props) => {

    const { itemTypeId, itemCode, itemName, totalQuantity, instances } = props;

    // If overridden by ItemTypeManagementPage
    const { viewingInstancesOf } = props;

    const [expanded, setExpanded] = useState(viewingInstancesOf);

    const onExpandClick = () => {
        if (!viewingInstancesOf) {
            setExpanded(prevValue => !prevValue);
        }
    }

    return (
        <div className="grouped-item-instance-display-container" onClick={onExpandClick}>
            <div className="name-code-group">
                <span className="quantity-with-name">
                    <em className="total-quantity">x{totalQuantity}&nbsp;&nbsp;</em>
                    <span className="item-name">{itemName}</span>
                </span>
                <span className="item-code">
                    {itemCode}
                </span>
            </div>
            <div className={"expandable-container" + (expanded ? " expanded" : "")}>
                <div className="item-instances-display-container">
                    {instances.map((itemInstance) => (<SimpleItemInstanceDisplay key={itemInstance.itemInstanceId} itemInstance={itemInstance} />))}
                </div>
            </div>
        </div>
    )
}

export const SimpleItemInstanceDisplay = (props) => {

    const {
        itemInstance: {
            itemTypeId,
            itemInstanceId,
            datePurchased,
            dateAdded,
            quantity,
            buyPrice,
            sellPrice
        },
        tryNavigate,
    } = props;

    return (
        <div className="item-instance-display-container">
            <div className="quantity-with-instance-info">
                <em className="instance-quantity">x{quantity}&nbsp;&nbsp;</em>
                <div className="instance-info">
                    <span className="date-purchased">
                        Purchased {datePurchased}
                    </span>
                    <span className="date-added">
                        Added {dateAdded}
                    </span>
                    <span className="buy-sell">
                        Buy Price: {formatToUSCurrency(buyPrice)} | Sell Price: {formatToUSCurrency(sellPrice)}
                    </span>
                </div>
            </div>
        </div>
    )
}

export default ItemInstanceManagementPage;