import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "../sass/DashboardPage.scss"
import { FixedMobileBar, NavigationPanel, useGETNavInfo } from "../components/WebsiteNavigation.jsx";
import ViewInvoicePage from '../pages/Invoices/ViewInvoicePage'
import InvoiceManagementPage from '../pages/Invoices/InvoiceManagementPage'
import CreateInvoicePage from '../pages/Invoices/CreateInvoicePage'
import CustomerManagementPage from '../pages/Customer/CustomerManagementPage'
import CreateCustomerPage from '../pages/Customer/CreateCustomerPage'
import { AccountCircle as AccountCircleIcon, AddBox, Category, Description as DescriptionIcon, ListAlt as ListAltIcon, Logout as LogoutIcon, Person as PersonIcon, PersonAdd as PersonAddIcon, Warehouse as WarehouseIcon, ManageAccounts, Receipt as ReceiptIcon, PostAdd as PostAddIcon, PendingActions as PendingActionsIcon, HomeRepairService, NoteAlt as NoteAltIcon, Edit as EditIcon, NoteAdd as NoteAddIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import CreateItemTypePage from "./Item Types/CreateItemTypePage";
import ItemTypeManagementPage from "./Item Types/ItemTypeManagementPage";
import CreateItemInstancePage from "./Item Instances/CreateItemInstancePage";
import ItemInstanceManagementPage from "./Item Instances/ItemInstanceManagementPage";
import { logout } from "../API/APICalls";

export default function DashboardPage() {

    // Current page to be rendered inside the responsive-page-container. 
    // Tons of information (state changers, callbacks) generated here is added to the props of this page when it is rendered
    const [currentPage, setCurrentPage] = useState();

    // NavInfo received via GET request that we will use to build our dashboardTreeItems
    const [navInfo, refreshNavInfo] = useGETNavInfo();
    useEffect(() => void refreshNavInfo(), [refreshNavInfo]);

    // Has nothing to do with navInfo, this is just how we redirect to other pages with react-router-dom
    const navigate = useNavigate();

    // An array of objects describing RichTreeItem components to be passed to <NavigationPanel>
    // Updated whenever navInfo changes. Note that navInfo is a state variable so when it changes, a re-render occurs here
    const [dashboardTreeItems, treeItemMap] = useMemo(() => {
        return getDashboardTreeItemsFromNavInfo(navInfo, navigate, refreshNavInfo)
    }, [navInfo, navigate, refreshNavInfo]) // navInfo is the only 'real' dependency since navigate and refreshNavInfo are memoized

    // This is a ref because we want our 'currentPage' to set it/unset it without causing re-render
    const blockExitRef = useRef("");

    // Pages will call this upon mount if they want the data loss warning modal to pop up when the user wants to switch pages
    const blockExitWith = useCallback((message) => blockExitRef.current = message);

    // Pages will use this when their data is saved/the page has completed its task to prevent the data loss warning modal from appearing 
    const unblockExit = useCallback(() => blockExitRef.current = null);

    // Only gets set when the user attempts to select a new page and blockExitRef.current exists
    // This will cause the "Are you sure?" modal to pop up
    const [triedToSelect, setTriedToSelect] = useState();

    const [selected, setSelected] = useState([]);

    // When a node selection event is triggered (via clicking, or pressing enter on focused node) this callback will run.
    const trySelectNode = useCallback((event, nodeId) => {

        let item = treeItemMap[nodeId]
        if (!item) {
            // ig it is *techicallyyyy* possible for our data loss warning modal to call trySelectNode on a node that is gone now....
        }

        if (blockExitRef.current && (item.page || item.onSelected && item.pageLossOnSelect)) {
            setTriedToSelect(nodeId)
            return;
        }

        item.page && setCurrentPage(item.page)
        item.onSelected && item.onSelected()
        setSelected(nodeId);

    }, [treeItemMap])

    // These props below are passed down to whatever page is rendered inside the responsive-page-container
    let pageProps = { setCurrentPage, refreshNavInfo, blockExitWith, unblockExit }
    const pageElement = currentPage ? React.cloneElement(currentPage, pageProps) : <DashboardContent {...pageProps} />

    return (
        <div className="general-page-container">
            <div className="general-page">
                <div className="responsive-page-container">
                    {triedToSelect &&
                        <PageChangeWarning
                            triedToSelect={triedToSelect}
                            setTriedToSelect={setTriedToSelect}
                            blockExitRef={blockExitRef}
                            trySelectNode={trySelectNode} />}
                    <FixedMobileBar navInfo={dashboardTreeItems} />
                    <NavigationPanel
                        treeItems={dashboardTreeItems}
                        onNodeSelect={trySelectNode}
                        selected={selected} />
                    <div className="sub-page-container">
                        {pageElement}
                    </div>
                </div>
            </div>
        </div>
    )
}

const PageChangeWarning = ({ triedToSelect, setTriedToSelect, blockExitRef, trySelectNode }) => {

    const onProceed = () => {
        blockExitRef.current = ""
        setTriedToSelect(null)
        trySelectNode(null, [triedToSelect])
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

const DashboardContent = () => {

    return (
        <div className="dashboard-page">
            DASH
        </div>
    )
}

const addFg = "#148f28"
const addBg = "#d8eddb"

const manageFg = "#148f28"
const manageBg = "#d8eddb"

// TODO remove refreshnavinfo later, unless i actually wanna use it
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

    let nodeId = 1;

    function getId() {
        return String(nodeId++);
    }

    function CreateNode(labelText, labelIcon, labelInfo, color, bgColor) {
        return {
            nodeId: getId(),
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
            ...CreateNode("My Account", AccountCircleIcon),
            nodeChildren: [
                {
                    ...CreateNode("Log Out", LogoutIcon),
                    pageLossOnSelect: true,
                    onSelected: () => logout(navigate),
                },
                {
                    ...CreateNode("Refresh Nav Info", RefreshIcon),
                    onSelected: () => refreshNavInfo(),
                },
            ],
        },
        {
            ...CreateNode("Inventory", WarehouseIcon),
            nodeChildren: [
                {
                    ...CreateNode("Item Types", Category),
                    nodeChildren: [
                        {
                            ...CreateNode("Define New Item Type", AddBox, "", addFg, addBg),
                            page: <CreateItemTypePage />,
                        },
                        {
                            ...CreateNode("Manage Item Types", ListAltIcon, "", manageFg, manageBg),
                            page: <ItemTypeManagementPage />,
                        },
                    ],
                },
                {
                    ...CreateNode("Item Instances", HomeRepairService),
                    nodeChildren: [
                        {
                            ...CreateNode("Create New", AddBox, "", addFg, addBg),
                            page: <CreateItemInstancePage />,
                        },
                        {
                            ...CreateNode("Manage Item Instances", ListAltIcon, "", manageFg, manageBg),
                            page: <ItemInstanceManagementPage />,
                        },
                    ],
                },
                {
                    ...CreateNode("Stock Changes", DescriptionIcon),
                    nodeChildren: [
                        {
                            ...CreateNode("Create New", NoteAddIcon, "", addFg, addBg),
                            page: <CreateItemInstancePage />,
                        },
                        {
                            ...CreateNode("In Progress", PendingActionsIcon, "", manageFg, manageBg),
                            page: <ItemInstanceManagementPage />,
                        },
                        {
                            ...CreateNode("View All", ListAltIcon, "", manageFg, manageBg),
                            page: <ItemInstanceManagementPage />,
                        },
                    ],
                },
            ],
        },
        {
            ...CreateNode("Customers", PersonIcon, navInfo.customers),
            nodeChildren: [
                {
                    ...CreateNode("Create New Customer", PersonAddIcon, "", addFg, addBg),
                    page: <CreateCustomerPage />,
                },
                {
                    ...CreateNode("Manage Customers", ManageAccounts, "", manageFg, manageBg),
                    page: <CustomerManagementPage />,
                },
            ],
        },
        {
            ...CreateNode("Invoices", ReceiptIcon, ""),
            nodeChildren: [
                {
                    ...CreateNode("Create New Invoice", PostAddIcon, "", addFg, addBg),
                    page: <CreateInvoicePage />,
                },
                {
                    ...CreateNode("View Completed Invoices", ListAltIcon, "", addFg, addBg),
                    page: <InvoiceManagementPage />,
                },
                {
                    ...CreateNode("In Progress", PendingActionsIcon, "", addFg, addBg),
                    nodeChildren: navInfo.inProgressInvoices.map(({ customerName, invoiceId }) => ({
                        ...CreateNode(customerName, ReceiptIcon, ""),
                        page: <ViewInvoicePage invoiceId={invoiceId} />,
                    })),
                },
            ],
        },
    ];

    const nodeMap = nodeMapList(nodes);

    return [nodes, nodeMap]
}

const nodeMapRec = (currNode, map = {}) => {
    map[currNode.nodeId] = currNode;
    nodeMapList(currNode.nodeChildren, map);
    return map;
}

const nodeMapList = (nodes, map = {}) => {
    for (let nodeChild of nodes ?? [])
        nodeMapRec(nodeChild, map);
    return map;
}