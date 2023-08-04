import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { effectAbortSignal, useUnmountTimeoutCancel } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";
import "../../sass/ItemTypeManagement.scss"
import { Button } from "@mui/material";
import { Add, AddOutlined, Edit, EditOutlined, Visibility, VisibilityOutlined } from "@mui/icons-material";
import CreateItemTypePage from "./CreateItemTypePage";
import { formatToUSCurrency } from "../../tools/generalTools";
import { FormInput, FormSelectInput } from "../../components/FormComponents";

const ItemTypeManagementPage = (props) => {

    const { viewingId, editingId } = props.currURLQuery;

    if (viewingId) {
        return <ViewItemTypePage {...props} currURLQuery={{ itemTypeId: Number(viewingId) }} />
    }

    if (editingId) {
        return <CreateItemTypePage {...props} currURLQuery={{ editingId: Number(editingId) }} />
    }

    return <ItemsView {...props} />
}

const ItemsView = (props) => {

    // Inherited dashboard control props
    const { selectNodeNextRefresh, refreshTreeInfo, tryNavigate, lockExitWith, unlockExit, addDashboardMessage, currURLQuery, currURLPath } = props;

    const { filterBy, filterType, filterQuery } = currURLQuery;

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

    // Filtering controls. currentSearch is what the user modifies
    // currentSearchInternal eventually gets changed via navigation, but is throttled
    const [currentSearchInternal, setCurrentSearchInternal] = useState("");
    const [currentSearch, setCurrentSearch] = useState("");
    const [filteringBy, setFilteringBy] = useState("Name");
    const [filteringType, setFilteringType] = useState("Any");

    // Whenever relevant currURLQuery params change 
    useEffect(() => {
        setCurrentSearchInternal(filterQuery ?? "");
        setCurrentSearch(filterQuery ?? "");
        setFilteringBy(filterBy ?? "Name")
        setFilteringType(filterType ?? "Any")
    }, [filterBy, filterType, filterQuery])

    // When currentSearch changes, 0.5 seconds later we will update currentSearchInternal
    const currentSearchUpdateThrottleRef = useRef();
    useUnmountTimeoutCancel(currentSearchUpdateThrottleRef);
    useEffect(() => {

        if (currentSearchUpdateThrottleRef.current) {
            clearTimeout(currentSearchUpdateThrottleRef.current);
        }

        currentSearchUpdateThrottleRef.current = setTimeout(() => {
            tryNavigate({
                path: "/itemTypes",
                replace: true,
                query: currentSearch ? {
                    filterBy: filteringBy,
                    filterType: filteringType,
                    filterQuery: currentSearch,
                } : undefined
            })
        }, 500)
    }, [currentSearch])

    // This memo only updates when state variables update, so when it updates it is always accompanied by a re-render
    const filteredTypes = useMemo(() => {

        if (!currentSearchInternal) {
            return [...itemTypes];
        }

        return itemTypes.filter(type => {

            let applyingFilterTo;
            switch (filteringBy) {
                case "Code":
                    applyingFilterTo = type.itemCode.toLowerCase();
                    break;
                case "Name":
                default:
                    applyingFilterTo = type.itemName.toLowerCase();
                    break;
            }

            const keywords = currentSearchInternal.split(" ").map(word => word.toLowerCase());
            switch (filteringType) {
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

    }, [filteringBy, filteringType, currentSearchInternal, itemTypes])

    let createJsx = (
        <div className="management-create-button-container">
            <Button
                fullWidth
                size="large"
                color="success"
                variant="contained"
                onClick={() => tryNavigate({ path: "/itemTypes/create" })}>
                <span>Create New Item Type</span>
            </Button>
        </div>
    )

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
                filteringBy={filteringBy} setFilteringBy={setFilteringBy}
                filteringType={filteringType} setFilteringType={setFilteringType}>
            </ItemTypeFilter>
            {createJsx}
            {noneJsx}
            <div className="item-types-display-container">
                {filteredTypes.map((itemType) => <SimpleItemTypeDisplay
                    key={itemType.itemCode}
                    itemType={itemType}
                    tryNavigate={tryNavigate}
                    filterByUsed={filteringBy}
                    filterTypeUsed={filteringType}
                    queryUsed={currentSearchInternal}
                />)}
            </div>
        </div>
    )
}

export const ItemTypeFilter = (props) => {

    const { currentSearch, setCurrentSearch, filteringBy, setFilteringBy, filteringType, setFilteringType } = props;

    return (
        <div className="management-filtering-container">
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
                    value={filteringBy}
                    setState={setFilteringBy}
                    values={["Name", "Code"]}
                    label="Filter By">
                </FormSelectInput>
            </div>
            <div className="filter-type">
                <FormSelectInput
                    minHelperText
                    fullWidth
                    value={filteringType}
                    values={["Any", "All", "Exact"]}
                    setState={setFilteringType}
                    label="Filter Type">
                </FormSelectInput>
            </div>
        </div>
    )
}

const ViewItemTypePage = (props) => {

    // Inherited props
    const { selectNodeNextRefresh, refreshTreeInfo, tryNavigate, lockExitWith, unlockExit, addDashboardMessage, currURLQuery } = props;

    const { itemTypeId } = currURLQuery;

    return <div>What a view</div>

}

export const SimpleItemTypeDisplay = (props) => {

    // The search used to map this ItemTypeDisplay
    const { filterByUsed, filterTypeUsed, queryUsed } = props;

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
        tryNavigate,
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
                        tryNavigate({
                            path: "/itemInstances/create",
                            query: {
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
                        tryNavigate({
                            path: "/itemTypes",
                            query: {
                                editingId: itemTypeId,
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
                        tryNavigate({
                            path: "/itemInstances",
                            query: {
                                viewingInstancesOf: itemCode,
                                filterQuery: itemCode,
                                filterBy: "Code",
                                filterType: "Exact",
                            }
                        })
                    }}
                    endIcon={<VisibilityOutlined />}
                    variant="outlined">
                    <span>View Instances</span>
                </Button>
            </div>
        </div >
    )
}

export default ItemTypeManagementPage;