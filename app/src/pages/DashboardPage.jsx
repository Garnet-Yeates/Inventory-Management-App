import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "../sass/DashboardPage.scss"
import useGETNavInfo from "../hooks/useGetNavInfo.js";
import ViewInvoicePage from '../pages/Invoices/ViewInvoicePage'
import InvoiceManagementPage from '../pages/Invoices/InvoiceManagementPage'
import CreateInvoicePage from '../pages/Invoices/CreateInvoicePage'
import CustomerManagementPage from '../pages/Customer/CustomerManagementPage'
import CreateCustomerPage from '../pages/Customer/CreateCustomerPage'
import { AccountCircle as AccountCircleIcon, AddBox, Category, Description as DescriptionIcon, ListAlt as ListAltIcon, Logout as LogoutIcon, Person as PersonIcon, PersonAdd as PersonAddIcon, Warehouse as WarehouseIcon, ManageAccounts, Receipt as ReceiptIcon, PostAdd as PostAddIcon, PendingActions as PendingActionsIcon, HomeRepairService, NoteAlt as NoteAltIcon, Edit as EditIcon, NoteAdd as NoteAddIcon, Refresh as RefreshIcon, Dashboard as DashboardIcon, Menu as MenuIcon, Close as CloseIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import CreateItemTypePage from "./Item Types/CreateItemTypePage";
import ItemTypeManagementPage from "./Item Types/ItemTypeManagementPage";
import CreateItemInstancePage from "./Item Instances/CreateItemInstancePage";
import ItemInstanceManagementPage from "./Item Instances/ItemInstanceManagementPage";
import { logout } from "../API/APICalls";
import { IconButton } from "@mui/material";
import RichTreeView from "../components/RichTreeView";
import { AnimatePresence, motion } from "framer-motion";
import usePrevious from "../hooks/usePrevious";

export default function DashboardPage(props) {

    console.log("------------------- RENDER BEGIN --------------")

    // We use the 'controlled tree' capability of Mui TreeView
    const [selected, setSelected] = useState("");
    const [expanded, setExpanded] = useState([]);

    // Current page to be rendered inside the responsive-page-container. 
    // Tons of information (state changers, callbacks) generated here is added to the props of this page when it is rendered
    const [currentPage, setCurrentPage] = useState();

    const {
        initialNode = "createNewItemInstance",
        additionalNodeInfo: additionalNavInfo,

    } = props;

    // Determines if the mobile panel is open or closed. It is invisible no matter what on desktop
    const [mobilePanelShown, setMobilePanelShown] = useState(false);

    // Has nothing to do with navInfo, this is just how we redirect to other pages with react-router-dom
    const navigate = useNavigate();

    // NavInfo received via GET request that we will use to build our dashboardTreeItems
    const [navInfo, refreshNavInfo] = useGETNavInfo();

    const selectNextRefreshRef = useRef();
    const selectNodeNextRefresh = useCallback((nodeId) => {
        selectNextRefreshRef.current = nodeId;
    }, [])

    // Select initial node on mount and ONLY on mount (0 dependencies, we don't care to re-select initialNode if the prop changes after mounting)
    useEffect(() => {
        selectNodeNextRefresh(initialNode); 
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Refresh navInfo whenever additionalNavInfo prop changes (or on first mount). Notice how this effect runs after our effect to selectNodeNextRefresh(initialNode) (they work together on first mount)
    useEffect(() => {
        refreshNavInfo(additionalNavInfo)
        // eslint-disable-next-line react-hooks/exhaustive-deps    
    }, [additionalNavInfo])

    // An array of objects describing RichTreeItem components to be passed to <NavigationPanel> and <MobileNavigationBar>
    // Updated whenever navInfo changes. Note that navInfo is a state variable so when it changes a re-render also occurs before this memo is updated
    const [dashboardTreeItems, treeItemMap] = useMemo(() => {
        console.log("navInfo changed, calling getDashboardTreeItemsFromNavInfo to update memo")
        return getDashboardTreeItemsFromNavInfo(navInfo, navigate, refreshNavInfo)
        // eslint-disable-next-line react-hooks/exhaustive-deps    
    }, [navInfo]) 

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
        if (!node) { // Prolly won't ever happen
            return console.log(`Could not select node with nodeId={${nodeId}} as it does not exist in the node map`)
        }

        // If this block runs it causes the data loss warning modal to render
        if (blockExitRef.current && (node.page || (node.onSelected && node.pageLossOnSelect))) {
            setTriedToSelect(nodeId)
            return;
        }

        // Down here it is implied that their action went through

        if (node.page) {
            let { type: Page, props } = node.page;
            setCurrentPage(<Page {...props} nodeId={nodeId} />) // Add nodeId as a prop here. Technically could do it when we declare the page JSX in getDashboardTreeItemsFromNavInfo but it would create redundancies in that method 
        }
        if (node.onSelected) {
            node.onSelected();
        }

        // Don't call setSelected unless the node info has 'page' or 'pageLossOnSelect' set. This ensures that the currently
        // selected node is always associated with the current page (of loss thereof) in the eyes of the user
        let selectedSomething = false;

        if (node.page || node.pageLossOnSelect) {
            console.log(`trySelectNode: calling setSelected(${nodeId}). setCurrentPage may have been called as well`)
            setSelected(nodeId);
            selectedSomething = true;
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
        else { // If a user manually selected a node
            if (selectedSomething) {
                setMobilePanelShown(false);
            }
        }

    }, [treeItemMap, expanded, selected])

    // Only nodes that cause 'currentPage' to change/unmount can be selected in this tree view. See trySelectNode 
    const onNodeSelect = useCallback((_, nodeId) => trySelectNode(nodeId), [trySelectNode]);

    // For node expansion, there is no change in user triggered logic. However if you look in trySelectNode you can see we use expansion logic there
    const onNodeToggle = useCallback((_, nodeIds) => setExpanded(nodeIds), [setExpanded])

    // Whenever dashboardTreeItems updates to a non empty object, we will programatically select the node stored in the ref
    useEffect(() => {
        if (Object.keys(dashboardTreeItems).length > 0 && selectNextRefreshRef.current) {
            console.log("[dashboardTreeItems effect]: trySelectNode(selectNextRefreshRef.current)")
            trySelectNode(selectNextRefreshRef.current, true)
            selectNextRefreshRef.current = null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps    
    }, [dashboardTreeItems]);

    useEffect(() => {
        console.log("------------------- LAST EFFECT RAN --------------")
    })

    const { type: CurrentPage, pageProps: { nodeId, ...pagePropsRest } = {} } = currentPage ?? {}

    const treeViewProps = { treeItems: dashboardTreeItems, onNodeSelect, onNodeToggle, selected, expanded };

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
                    <MobileNavigationBar
                        mobilePanelShown={mobilePanelShown}
                        setMobilePanelShown={setMobilePanelShown}
                        {...treeViewProps}>
                    </MobileNavigationBar>
                    <DesktopNavigationPanel {...treeViewProps} />
                    <div className="sub-page-container">
                        {currentPage && <CurrentPage
                            nodeId={nodeId}
                            key={nodeId}
                            setCurrentPage={setCurrentPage}
                            refreshNavInfo={refreshNavInfo}
                            selectNodeNextRefresh={selectNodeNextRefresh}
                            lockExitWith={lockExitWith}
                            unlockExit={unlockExit}
                            {...pagePropsRest} // <- Whatever props are defined for the page in getDashboardTreeItemsFromNavInfo
                        >
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
export const MobileNavigationBar = ({ mobilePanelShown, setMobilePanelShown, ...richTreeViewProps }) => {

    return (
        <nav className="mobile-navigation">
            <div className="mobile-navigation-bar">
                <IconButton onClick={() => setMobilePanelShown(true)}>
                    <MenuIcon />
                </IconButton>
            </div>
            <MobileNavigationPanel panelShown={mobilePanelShown} setPanelShown={setMobilePanelShown} {...richTreeViewProps} />
            <AnimatePresence>
                {mobilePanelShown && <motion.div className="fixed-info-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15, delay: 0 }} />}
            </AnimatePresence>
        </nav>)
}

export const MobileNavigationPanel = ({ panelShown, setPanelShown, ...richTreeViewProps }) => {
    return (
        <div className={"mobile-navigation-panel" + (panelShown ? " visible" : "")}>
            <div className="mobile-navigation-header">
                <h3 className="mobile-navigation-heading">Navigation</h3>
                <IconButton onClick={() => setPanelShown(false)}>
                    <CloseIcon />
                </IconButton>
            </div>
            <div className="mobile-navigation-tree-view-wrapper">
                <RichTreeView {...richTreeViewProps} />
            </div>
        </div>
    )
}

// Will ONLY be displayed on md or higher, and it will be on the left side of our 'flex-row' responsive-page
export const DesktopNavigationPanel = ({ ...richTreeViewProps }) => {

    return (
        <nav className="navigation-panel">
            <div className="navigation-tree-view-wrapper">
                <RichTreeView {...richTreeViewProps} />
            </div>
        </nav>
    )
}

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
            ...Node("overview", "Overview", DashboardIcon, "", purpleFg, purpleBg),
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
                            ...Node("createNewItemInstance", "Create New", AddBox, "", greenFg, greenBg),
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