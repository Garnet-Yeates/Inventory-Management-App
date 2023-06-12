import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "../sass/DashboardPage.scss"
import useGETNavInfo from "../hooks/useGetNavInfo.js";
import ViewInvoicePage from '../pages/Invoices/ViewInvoicePage'
import InvoiceManagementPage from '../pages/Invoices/InvoiceManagementPage'
import CreateInvoicePage from '../pages/Invoices/CreateInvoicePage'
import CustomerManagementPage from '../pages/Customer/CustomerManagementPage'
import CreateCustomerPage from '../pages/Customer/CreateCustomerPage'
import { AccountCircle as AccountCircleIcon, AddBox, Category, Description as DescriptionIcon, ListAlt as ListAltIcon, Logout as LogoutIcon, Person as PersonIcon, PersonAdd as PersonAddIcon, Warehouse as WarehouseIcon, ManageAccounts, Receipt as ReceiptIcon, PostAdd as PostAddIcon, PendingActions as PendingActionsIcon, HomeRepairService, NoteAlt as NoteAltIcon, Edit as EditIcon, NoteAdd as NoteAddIcon, Refresh as RefreshIcon, Dashboard as DashboardIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import CreateItemTypePage from "./Item Types/CreateItemTypePage";
import ItemTypeManagementPage from "./Item Types/ItemTypeManagementPage";
import CreateItemInstancePage from "./Item Instances/CreateItemInstancePage";
import ItemInstanceManagementPage from "./Item Instances/ItemInstanceManagementPage";
import { TreeView } from '@mui/lab'
import { ArrowDropDown, ArrowRight } from '@mui/icons-material'
import { logout } from "../API/APICalls";
import RichTreeItem from "../components/RichTreeItem";

export default function DashboardPage() {

    // Has nothing to do with navInfo, this is just how we redirect to other pages with react-router-dom
    const navigate = useNavigate();

    // Current page to be rendered inside the responsive-page-container. 
    // Tons of information (state changers, callbacks) generated here is added to the props of this page when it is rendered
    const [currentPage, setCurrentPage] = useState();

    // NavInfo received via GET request that we will use to build our dashboardTreeItems
    const [navInfo, refreshNavInfo] = useGETNavInfo();
    useEffect(() => void refreshNavInfo(), [refreshNavInfo]);

    // An array of objects describing RichTreeItem components to be passed to <NavigationPanel>
    // Updated whenever navInfo changes. Note that navInfo is a state variable so when it changes, a re-render occurs here
    const [dashboardTreeItems, treeItemMap] = useMemo(() => {
        return getDashboardTreeItemsFromNavInfo(navInfo, navigate, refreshNavInfo)
    }, [navInfo, navigate, refreshNavInfo]) // navInfo is the only 'real' dependency since navigate and refreshNavInfo are memoized

    // We use the 'controlled tree' capability of Mui TreeView
    const [selected, setSelected] = useState([]);
    const [expanded, setExpanded] = useState([]);

    // This is a ref because we want our 'currentPage' to set it/unset it without causing re-render
    const blockExitRef = useRef("");

    // Pages will call this upon mount if they want the data loss warning modal to pop up when the user wants to switch pages
    const lockExitWith = useCallback((message) => blockExitRef.current = message, []);

    // Pages will use this when their data is saved/the page has completed its task to prevent the data loss warning modal from appearing 
    const unlockExit = useCallback(() => blockExitRef.current = null, []);

    // Gets set when the user attempts to select a new page when blockExitRef.current exists. If set, the data loss warning modal renders
    const [triedToSelect, setTriedToSelect] = useState();

    // When a node selection event is triggered (via clicking, or pressing enter on focused node) this callback will run.
    const trySelectNode = useCallback((nodeId, programmatic = false) => {

        // No additional logic if they are clicking the node that represents the current page (return)
        if (selected === nodeId) {
            return;
        }

        let node = treeItemMap[nodeId]
        if (!node) {
            return; // Don't think this will ever happen
        }

        // If this block runs it causes the data loss warning modal to render
        if (blockExitRef.current && (node.page || (node.onSelected && node.pageLossOnSelect))) {
            setTriedToSelect(nodeId)
            return;
        }

        node.page && setCurrentPage(node.page);
        node.onSelected && node.onSelected() 

        // Don't call setSelected unless the node info has 'page' or 'pageLossOnSelect' set. This ensures that the currently
        // selected node is always associated with the current page (of loss thereof) in the eyes of the user
        if (node.page || node.pageLossOnSelect) {
            setSelected(nodeId);
        }

        if (programmatic) {

            let newExpanded = [...expanded];

            // Create simple map for constant lookup operation time for seeing if a specific node is expanded
            let isExpanded = {};
            for (let nodeId of newExpanded) {
                isExpanded[nodeId] = true;
            }

            // When a node is selected we ensure that its parents are expanded
            // This is because there are cases where we will programatically select nodes and we want the user to see this happen
            for (let parentId of node.parentIds) {
                if (!isExpanded[parentId]) {
                    newExpanded.push(parentId);
                }
            }

            setExpanded(newExpanded);
        }

    }, [treeItemMap, expanded, selected])

    // Only nodes that cause 'currentPage' to change/unmount can be selected in this tree view. See trySelectNode 
    const onNodeSelect = useCallback((_, nodeId) => trySelectNode(nodeId), [trySelectNode]);

    // For node expansion, there is no change in user triggered logic. However if you look in trySelectNode you can see we use expansion logic there
    const onNodeToggle = useCallback((_, nodeIds) => setExpanded(nodeIds), [setExpanded])

    // The first time dashboardTreeItems updates to a non empty object, we will programatically select the overview node
    const didInitialSelection = useRef(false);
    useEffect(() => {
        if (Object.keys(dashboardTreeItems).length > 0 && !didInitialSelection.current) {
            didInitialSelection.current = true;
            trySelectNode("createNewItemInstane", true)
        }
    }, [dashboardTreeItems]);

    const { type: CurrentPage, pageProps } = currentPage ?? {}

    return (
        <div className="dashboard-page-container">
            <div className="dashboard-page">
                <div className="responsive-page-container">
                    {triedToSelect && <PageChangeWarning
                        triedToSelect={triedToSelect}
                        setTriedToSelect={setTriedToSelect}
                        blockExitRef={blockExitRef}
                        trySelectNode={trySelectNode}>
                    </PageChangeWarning>}
                    <FixedMobileBar navInfo={dashboardTreeItems} />
                    <NavigationPanel
                        treeItems={dashboardTreeItems}
                        onNodeSelect={onNodeSelect}
                        onNodeToggle={onNodeToggle}
                        selected={selected}
                        expanded={expanded}>
                    </NavigationPanel>
                    <div className="sub-page-container">
                        {currentPage && <CurrentPage {...pageProps}
                            setCurrentPage={setCurrentPage}
                            refreshNavInfo={refreshNavInfo}
                            lockExitWith={lockExitWith}
                            unlockExit={unlockExit}>
                        </CurrentPage>}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Will not be displayed on md or higher
// Display fixed and we prbably want responsive-page-container to be position relative <-- jk def not
// (so it is inside the 'gray' area on mobile)
export const FixedMobileBar = () => {
    return (
        <nav className="mobile-navigation-bar">

        </nav>)
}

// Will ONLY be displayed on md or higher, and it will be on the left side of our 'flex-row' responsive-page
export const NavigationPanel = React.memo(({ treeItems, ...rest }) => {

    const collapseIcon = <ArrowDropDown className="tree-view-icon" />
    const expandIcon = <ArrowRight className="tree-view-icon" />

    return (
        <nav className="navigation-panel">
            <div className="navigation-tree-view-wrapper">
                <TreeView 
                {...rest}
                defaultCollapseIcon={collapseIcon} 
                defaultExpandIcon={expandIcon}
                >
                    {treeItems.map(info => <RichTreeItem key={info.nodeId} {...info} />)}
                </TreeView>
            </div>
        </nav>
    )
})

const PageChangeWarning = ({ triedToSelect, setTriedToSelect, blockExitRef, trySelectNode }) => {

    const onProceed = () => {
        blockExitRef.current = ""
        setTriedToSelect(null)
        trySelectNode(triedToSelect)
    }

    const onNeverMind = () => {
        setTriedToSelect(null);
    }

    return (
        <div className="fixed-info-overlay">
            <div className="container">
                {blockExitRef.current}
                <button onClick={() => onProceed()}>Proceed</button>
                <button onClick={() => onNeverMind()}>Never Mind</button>
            </div>
        </div>
    )
}

const OverviewPage = () => {
    return (
        <div>
            Overview
        </div>
    )
}


const greenFg = "#148f28"
const greenBg = "#dff1e2"

const purpleFg = "#9c42f7"
const purpleBg = "#f2e4ff"

const blueFg = "#427ff7"
const blueBg = "#e4f0ff"

const orangeFg = "#f77f42"
const orangeBg = "#ffefe4"

const redFg = "#f74242"
const redBg = "#ffe4e4"

// TODO remove refreshnavinfo tree node item/dependency later, unless i actually wanna use it
// 

/**
 * When supplying 'onSelected' on one of the nodes, keep dependencies in mind (i.e if we change some other value besides
 * setCurrentPage in the onSelected, we need to make sure it is listed in the dependency array of the useMemo that calls
 * this function. An example of this is the logout node that has the 'navigate' dependency)
 * @param {*} navInfo 
 * @param {*} setCurrentPage 
 * @param {() => any} navigate 
 * @param {*} refreshNavInfo 
 * @returns 
 */
const getDashboardTreeItemsFromNavInfo = (navInfo, navigate, refreshNavInfo) => {

    if (!navInfo || Object.keys(navInfo).length === 0) {
        return [[], {}];
    }

    // Every node should have a unique, deterministic id based on what the node does
    function Node(nodeId, labelText, labelIcon, labelInfo, color, bgColor) {
        return {
            nodeId,
            labelText,
            labelIcon,
            labelInfo,
            color,
            bgColor,
        }
    }

    // Map response.data to RichTreeItem props
    const nodes = [
        {
            ...Node("overview", "Overview", DashboardIcon, ""),
            page: <OverviewPage />
        },
        {
            ...Node("account", "My Account", AccountCircleIcon),
            nodeChildren: [
                {
                    ...Node("logout", "Log Out", LogoutIcon),
                    pageLossOnSelect: true,
                    onSelected: () => logout(navigate),
                },
                {
                    ...Node("refresh", "Refresh Nav Info", RefreshIcon),
                    onSelected: () => refreshNavInfo(),
                },
            ],
        },
        {
            ...Node("inventory", "Inventory", WarehouseIcon, ""),
            nodeChildren: [
                {
                    ...Node("itemTypes", "Item Types", Category, "", orangeFg, orangeBg),
                    nodeChildren: [
                        {
                            ...Node("createNewItemType", "Define New Item Type", AddBox, "", greenFg, greenBg),
                            page: <CreateItemTypePage />,
                        },
                        {
                            ...Node("manageItemTypes", "Manage Item Types", ListAltIcon, "", purpleFg, purpleBg),
                            page: <ItemTypeManagementPage />,
                        },
                    ],
                },
                {
                    ...Node("itemInstances", "Item Instances", HomeRepairService, "", orangeFg, orangeBg),
                    nodeChildren: [
                        {
                            ...Node("createNewItemInstane", "Create New", AddBox, "", greenFg, greenBg),
                            page: <CreateItemInstancePage />,
                        },
                        {
                            ...Node("manageItemInstances", "Manage Item Instances", ListAltIcon, "", purpleFg, purpleBg),
                            page: <ItemInstanceManagementPage />,
                        },
                    ],
                },
                {
                    ...Node("stockChanges", "Stock Changes", DescriptionIcon, "", orangeFg, orangeBg),
                    nodeChildren: [
                        {
                            ...Node("createNewStockChange", "Create New", NoteAddIcon, "", greenFg, greenBg),
                            page: <CreateItemInstancePage />,
                        },
                        {
                            ...Node("viewInProgressStockChanges", "In Progress", PendingActionsIcon, "", blueFg, blueBg),
                            page: <ItemInstanceManagementPage />,
                        },
                        {
                            ...Node("viewAllStockChanges", "View All", ListAltIcon, "", purpleFg, purpleBg),
                            page: <ItemInstanceManagementPage />,
                        },
                    ],
                },
            ],
        },
        {
            ...Node("customers", "Customers", PersonIcon, navInfo.customers),
            nodeChildren: [
                {
                    ...Node("createNewCustomer", "Create New Customer", PersonAddIcon, "", greenFg, greenBg),
                    page: <CreateCustomerPage />,
                },
                {
                    ...Node("manageCustomers", "Manage Customers", ManageAccounts, "", purpleFg, purpleBg),
                    page: <CustomerManagementPage />,
                },
            ],
        },
        {
            ...Node("invoices", "Invoices", ReceiptIcon, ""),
            nodeChildren: [
                {
                    ...Node("createNewInvoice", "Create New Invoice", PostAddIcon, "", greenFg, greenBg),
                    page: <CreateInvoicePage />,
                },
                {
                    ...Node("viewCompletedInvoices", "View Completed Invoices", ListAltIcon, "", purpleFg, purpleBg),
                    page: <InvoiceManagementPage />,
                },
                {
                    ...Node("viewInProgressInvoices", "In Progress", PendingActionsIcon, "", blueFg, blueBg),
                    nodeChildren: navInfo.inProgressInvoices.map(({ customerName, invoiceId }) => ({
                        ...Node(`viewInProgressInvoiceId${invoiceId}`, customerName, ReceiptIcon, ""),
                        page: <ViewInvoicePage invoiceId={invoiceId} />,
                    })),
                },
            ],
        },
    ];

    const nodeMap = nodeMapMultiple(nodes);
    calculateParentMultiple(nodes);

    return [nodes, nodeMap]
}

const nodeMapRec = (currNode, map = {}) => {
    map[currNode.nodeId] = currNode;
    nodeMapMultiple(currNode.nodeChildren, map);
    return map;
}

const nodeMapMultiple = (nodes, map = {}) => {
    for (let nodeChild of nodes ?? [])
        nodeMapRec(nodeChild, map);
    return map;
}

const calculateParent = (currNode, parentArr) => {
    currNode.parentIds = parentArr;
    // Note we clone array here instead of in the multiple method, so siblings share a reference to the same parent arr
    parentArr = [...parentArr, currNode.nodeId];
    calculateParentMultiple(currNode.nodeChildren, parentArr);
}

const calculateParentMultiple = (nodes, parentArr = []) => {
    for (let node of nodes ?? [])
        calculateParent(node, parentArr);
}