import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "../sass/DashboardPage.scss"
import useGETTreeInfo from "../hooks/useGetTreeInfo.js";
import ViewInvoicePage from '../pages/Invoices/ViewInvoicePage'
import InvoiceManagementPage from '../pages/Invoices/InvoiceManagementPage'
import CreateInvoicePage from '../pages/Invoices/CreateInvoicePage'
import CustomerManagementPage from '../pages/Customer/CustomerManagementPage'
import CreateCustomerPage from '../pages/Customer/CreateCustomerPage'
import { AccountCircle as AccountCircleIcon, AddBox, Category, Description as DescriptionIcon, ListAlt as ListAltIcon, Logout as LogoutIcon, Person as PersonIcon, PersonAdd as PersonAddIcon, Warehouse as WarehouseIcon, ManageAccounts, Receipt as ReceiptIcon, PostAdd as PostAddIcon, PendingActions as PendingActionsIcon, HomeRepairService, NoteAlt as NoteAltIcon, Edit as EditIcon, NoteAdd as NoteAddIcon, Refresh as RefreshIcon, Dashboard as DashboardIcon, Menu as MenuIcon, Close as CloseIcon } from "@mui/icons-material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import CreateItemTypePage from "./Item Types/CreateItemTypePage";
import ItemTypeManagementPage from "./Item Types/ItemTypeManagementPage";
import CreateItemInstancePage from "./Item Instances/CreateItemInstancePage";
import ItemInstanceManagementPage from "./Item Instances/ItemInstanceManagementPage";
import { logout } from "../API/APICalls";
import { Button, IconButton } from "@mui/material";
import RichTreeView from "../components/RichTreeView";
import { AnimatePresence, motion } from "framer-motion";
import usePrevious from "../hooks/usePrevious";
import SecurityIcon from '@mui/icons-material/Security';
import queryString from "query-string";
import { stripTrailingSlash } from "../tools/generalTools";
import { useFocus } from "../hooks/useFocus";

export default function DashboardPage() {

    console.log("------------------- RENDER BEGIN --------------")

    // We use the 'controlled tree' capability of Mui TreeView
    const [selected, setSelected] = useState("");
    const [expanded, setExpanded] = useState([]);

    // Current page to be rendered inside the responsive-page-container. We pass down a bunch of additional props to currentPage to do dashboard operations
    const [currentPage, setCurrentPage] = useState();

    // TreeInfo received via GET request that we will use to build our dashboardTreeItems
    const [treeInfo, refreshTreeInfo] = useGETTreeInfo();

    // React-router-dom stuff
    const {
        navigate,
        currURLPath,
        prevURLPath,
        currURLQuery,
        currURLQueryString,
        prevURLQueryString,
        routingParams
    } = useDashboardRouting();

    // Data loss warning modal stuff
    const {
        blockExitRef, // If set, attempting to navigate via clicking on a TreeItem will fail, setting 'triedToSelect' and bringing up a warning modal
        lockExitWith, // Child pages can use this to lock exiting
        unlockExit, // Child pages can use this to unlock exiting
        triedToSelect, // This stores information about their failed selection attempt
        setTriedToSelect // We use this in our tryNavigate function
    } = useDataLossWarning({ currURLPath, prevURLPath, currURLQueryString, prevURLQueryString })

    // Try to focus the 'focus-break' div every time, effectively breaking focus from the selected TreeItem
    // this makes it so when the user is pressing the [<-] [->] buttons on their browser, it doesn't look like two
    // TreeItems are selected
    const [focusBreakRef, breakFocus] = useFocus();
    useEffect(() => {
        breakFocus();
    }, [currURLPath])

    // Cache dashboardTreeItems
    const [dashboardTreeItems, treeItemMap] = useMemo(() => getDashboardTreeItemsFromTreeInfo(treeInfo, navigate, refreshTreeInfo), [treeInfo, navigate])

    // Refresh tree info (i.e: re-build dashboardTreeItems) on mount
    useEffect(() => {
        refreshTreeInfo()
    }, [])

    // Try to select subPage whenever it changes or whenever treeInfo updates
    useEffect(() => {

        const node = treeItemMap[currURLPath];

        if (node) {
            ensureParentsExpanded(node, expanded, setExpanded);
            setSelected(currURLPath)

            if (!node.page) {
                throw new Error("Nodes whose ID matches a URLPath (e.g /itemTypes) must have a page to render")
            }

            let { type: Page, props } = node.page;
            setCurrentPage(<Page {...props} nodeId={nodeId} />) // Add nodeId as a prop here. Technically could do it when we declare the page JSX props in getDashboardTreeItemsFromTreeInfo but it would create redundancies in that method 
        }
    }, [currURLPath, dashboardTreeItems])

    // Dashboard message system, for example "Customer Successfully Created"
    const [messages, setMessages] = useState({})
    const addDashboardMessage = useCallback((messageKey, message) => {
        messages[messageKey] = message;
        setMessages({ ...messages });
    }, [messages, setMessages])

    // Mobile version of navigation
    const [mobilePanelShown, setMobilePanelShown] = useState(false);

    // When a node selection event is triggered (via clicking, or pressing enter on focused node, programmatically) this callback will run.
    const tryNavigate = useCallback((config) => {

        const { path, query, replace, userTriggered = false } = config;

        console.log("tryNavigate to:", path, "query:", query);

        const node = treeItemMap[path];
        if (!node) {
            return console.log("tryNavigate failed (node not found)")
        }

        const qString = query ? ("?" + queryString.stringify(query)) : "";

        // No additional logic if they are clicking the node that exactly represents the current page (return)
        if (path === currURLPath && currURLQueryString === qString) {
            console.log("tryNavigate blocked since nothing would happen")
            return;
        }

        // If this block runs it causes the data loss warning modal to render. Clicking proceed will remove the
        // blockExitRef.current and then it will call tryNavigate, preserving their initial nodeId selection and selection config
        if (blockExitRef.current && (node.page || node.pageLossOnSelect)) {
            setTriedToSelect(config);
            return;
        }

        if (node.page) {
            // After navigate gets called, render (1) happens where currURLPath is changed. 
            // (1) In this render, an effect sees that [currURLPath] dependency changed and changes currPage, causing render (2)
            // (2) currPage is now changed and the old page is unmounted and the new one is mounted
            navigate(path + qString, { replace })

            const currPageWillUnmount = currURLPath !== path;

            // Don't waste render (1) re-rendering currPage if we know that it will be replaced with new page on render (2)
            // This speeds things up a bit, and also prevents weird behavior on render (1) where currURLPath has changed,
            // but the currPage has not yet changed. This issue makes it so queryString props change for currPage on
            // render (1) even though it is going to unmount on render (2).
            // An example of this could be switching from /itemTypes?editingId=x to /anyOtherPage. On render 1,
            // ItemTypeManagementPage sees that editingId changed to nothing so it quickly flickers from editing to view all
            // causing a weird visual. There are also navigation side effects on 'View All Pages' (i.e navigating to update URL queryString to match curr filter)
            // - This solution works perfectly, as long as we have a one to one relationship mapping between URLPath and pages
            // - Otherwise there is the 'preload' solution - i.e we try to mount the new page before render 1 manually instead of temp setting to null. will also remove the 'blink' effect you see of there being no current page in render (1)
            if (currPageWillUnmount) {
                setCurrentPage(null);
            }
        }
        else {
            node.onSelected && node.onSelected();
        }

        userTriggered && setMobilePanelShown(false)

    }, [treeItemMap, expanded, selected, currURLQueryString, currURLPath, navigate])

    // Only nodes that cause 'currentPage' to change/unmount can be selected in this tree view. See tryNavigate 
    const onNodeSelect = useCallback((_, nodeId) => tryNavigate({ path: nodeId, userTriggered: true }), [tryNavigate]);

    // For node expansion, there is no change in user triggered logic.
    const onNodeToggle = useCallback((_, nodeIds) => setExpanded(nodeIds), [setExpanded])

    const { type: CurrentPage, props: { nodeId, ...pagePropsRest } = {} } = currentPage ?? {}

    const treeViewProps = { treeItems: dashboardTreeItems, onNodeSelect, onNodeToggle, selected, expanded };

    return (
        <div className="dashboard-page-container">
            <input className="focus-breaker" ref={focusBreakRef} />
            <div className="dashboard-page">
                <div className="responsive-page-container">
                    <AnimatePresence>
                        {triedToSelect && <PageChangeWarning
                            triedToSelect={triedToSelect}
                            setTriedToSelect={setTriedToSelect}
                            blockExitRef={blockExitRef}
                            tryNavigate={tryNavigate}>
                        </PageChangeWarning>}
                    </AnimatePresence>
                    <MobileNavigationBar
                        mobilePanelShown={mobilePanelShown}
                        setMobilePanelShown={setMobilePanelShown}
                        {...treeViewProps}>
                    </MobileNavigationBar>
                    <DesktopNavigationPanel {...treeViewProps} />
                    <div className="sub-page-container">
                        <DashboardMessagesContainer messages={messages} setMessages={setMessages} />
                        {currentPage && <CurrentPage
                            nodeId={nodeId}
                            key={nodeId}
                            currURLPath={currURLPath}
                            refreshTreeInfo={refreshTreeInfo}
                            tryNavigate={tryNavigate}
                            lockExitWith={lockExitWith}
                            unlockExit={unlockExit}
                            addDashboardMessage={addDashboardMessage}
                            currURLQuery={currURLQuery}
                            {...pagePropsRest} // <- Whatever props are defined for the page in getDashboardTreeItemsFromTreeInfo
                        >
                        </CurrentPage>}
                    </div>
                </div>
            </div>
        </div>
    )
}

export const DashboardMessagesContainer = ({ messages, setMessages }) => {

    return (
        <div className="messages-box">
            <AnimatePresence>
                {Object.keys(messages).map(key => {
                    return <DashboardMessage key={key} messageKey={key} messages={messages} setMessages={setMessages} {...messages[key]} />
                })}
            </AnimatePresence>
        </div>
    )
}

const messageInitial = { y: "-50px", opacity: 0 }
const messageAnimate = { y: 0, opacity: 1, transition: { duration: 0.75 } }
const messageExit = { opacity: 0, transition: { duration: 1.25 } };

export const DashboardMessage = ({ messageKey, messages, setMessages, type = "info", text, selfClosing = true, closeTimer = 2 }) => {

    const latestTimeoutRef = useRef();

    const onXClick = () => {
        selfClosing && clearTimeout(latestTimeoutRef)
        delete messages[messageKey]
        setMessages({ ...messages })
    }

    useEffect(() => {
        if (selfClosing) {
            const id = setTimeout(() => onXClick(), closeTimer * 1000)
            latestTimeoutRef.current = id;
            return () => clearTimeout(id);
        }
    }, [])

    return (
        <motion.div className="p-2 w-100" initial={messageInitial} animate={messageAnimate} exit={messageExit}>
            <div className={`message-container ${type}`}>
                <p className="message-text">{text}</p>
                <IconButton size="small" onClick={onXClick}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </div>
        </motion.div>
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

const PageChangeWarning = ({ triedToSelect, setTriedToSelect, blockExitRef, tryNavigate }) => {

    const onProceed = () => {
        blockExitRef.current = ""
        setTriedToSelect(null)
        tryNavigate(triedToSelect)
    }

    const onNeverMind = () => {
        setTriedToSelect(null);
    }

    return (
        <motion.div className="fixed-info-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15, delay: 0 }}>
            <div className="fixed-info-modal-container">
                <div className="fixed-info-modal page-change-warning-modal">
                    <h4 className="page-change-warning-heading py-2">Warning</h4>
                    <p className="page-change-warning-quote">
                        {blockExitRef.current}
                    </p>
                    <div className="row gx-1">
                        <div className="col-auto">
                            <Button
                                size="large"
                                variant="contained"
                                onClick={onNeverMind}>
                                <span>Never Mind</span>
                            </Button>
                        </div>
                        <div className="col-auto">
                            <Button
                                color="error"
                                size="large"
                                variant="contained"
                                onClick={onProceed}>
                                <span>Proceed</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="page-change-warning-modal">
                {blockExitRef.current}
                <button onClick={() => onProceed()}>Proceed</button>
                <button onClick={() => onNeverMind()}>Never Mind</button>
            </div>
        </motion.div>
    )
}

const OverviewPage = () => {
    return (
        <div className="overview-sub-page">
            <h2 className="sub-page-heading">Overview Page (TODO)</h2>
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

// TODO remove refreshtreeinfo tree node item/dependency later, unless i actually wanna use it

/**
 * When supplying 'onSelected' on one of the nodes, keep dependencies in mind (i.e if we change some other value besides
 * setCurrentPage in the onSelected, we need to make sure it is listed in the dependency array of the useMemo that calls
 * this function. An example of this is the logout node that has the 'navigate' dependency)
 * @param {*} treeInfo 
 * @param {*} setCurrentPage 
 * @param {() => any} navigate 
 * @param {*} refreshTreeInfo 
 * @returns 
 */
const getDashboardTreeItemsFromTreeInfo = (treeInfo, navigate, refreshTreeInfo) => {

    if (!treeInfo || Object.keys(treeInfo).length === 0) {
        return [[], {}];
    }

    // Map response.data to RichTreeItem props
    const nodes = [
        {
            nodeId: "/dashboard",
            labelText: "Overview",
            labelIcon: DashboardIcon,
            labelInfo: "",
            color: purpleFg,
            bgColor: purpleBg,
            page: <OverviewPage />
        },
        {
            nodeId: "authTest",
            labelText: "Authentication Testing",
            labelIcon: SecurityIcon,
            pageLossOnSelect: true,
            onSelected: () => navigate("/authTest"),
        },
        {
            nodeId: "/account",
            labelText: "My Account",
            labelIcon: AccountCircleIcon,
            nodeChildren: [
                {
                    nodeId: "logout",
                    labelText: "Log Out",
                    labelIcon: LogoutIcon,
                    pageLossOnSelect: true,
                    onSelected: () => logout(navigate),
                },
                {
                    nodeId: "refresh",
                    labelText: "Refresh Nav Info",
                    labelIcon: RefreshIcon,
                    onSelected: () => refreshTreeInfo(),
                },
            ],
        },
        {
            nodeId: "inventoryGroup",
            labelText: "Inventory",
            labelIcon: WarehouseIcon,
            color: orangeFg,
            bgColor: orangeBg,
            nodeChildren: [
                {
                    nodeId: "itemTypesGroup",
                    labelText: "Item Types",
                    labelIcon: Category,
                    labelInfo: treeInfo.itemTypes,
                    color: orangeFg,
                    bgColor: orangeBg,
                    nodeChildren: [
                        {
                            nodeId: "/itemTypes/create",
                            labelText: "Define New Item Type",
                            labelIcon: AddBox,
                            color: greenFg,
                            bgColor: greenBg,
                            page: <CreateItemTypePage />,
                        },
                        {
                            nodeId: "/itemTypes",
                            labelText: "Manage Item Types",
                            labelIcon: ListAltIcon,
                            color: purpleFg,
                            bgColor: purpleBg,
                            page: <ItemTypeManagementPage />,
                        },
                    ],
                },
                {
                    nodeId: "itemInstancesGroup",
                    labelText: "Item Instances",
                    labelIcon: HomeRepairService,
                    color: orangeFg,
                    bgColor: orangeBg,
                    nodeChildren: [
                        {
                            nodeId: "/itemInstances/create",
                            labelText: "Create New",
                            labelIcon: AddBox,
                            color: greenFg,
                            bgColor: greenBg,
                            page: <CreateItemInstancePage />,
                        },
                        {
                            nodeId: "/itemInstances",
                            labelText: "Manage Item Instances",
                            labelIcon: ListAltIcon,
                            color: purpleFg,
                            bgColor: purpleBg,
                            page: <ItemInstanceManagementPage />,
                        },
                    ],
                },
                {
                    nodeId: "stockChangesGroup",
                    labelText: "Stock Changes",
                    labelIcon: DescriptionIcon,
                    color: orangeFg,
                    bgColor: orangeBg,
                    nodeChildren: [
                        {
                            nodeId: "/stockChanges/create",
                            labelText: "Create New",
                            labelIcon: NoteAddIcon,
                            color: greenFg,
                            bgColor: greenBg,
                            page: <CreateItemInstancePage />,
                        },
                        {
                            nodeId: "/stockChanges/incomplete",
                            labelText: "In Progress",
                            labelIcon: PendingActionsIcon,
                            color: blueFg,
                            bgColor: blueBg,
                            page: <ItemInstanceManagementPage />,
                        },
                        {
                            nodeId: "/stockChanges",
                            labelText: "View All",
                            labelIcon: ListAltIcon,
                            color: purpleFg,
                            bgColor: purpleBg,
                            page: <ItemInstanceManagementPage />,
                        },
                    ],
                },
            ],
        },
        {
            nodeId: "customersGroup",
            labelText: "Customers",
            labelIcon: PersonIcon,
            labelInfo: treeInfo.customers,
            color: purpleFg,
            bgColor: purpleBg,
            nodeChildren: [
                {
                    nodeId: "/customers/create",
                    labelText: "Create New Customer",
                    labelIcon: PersonAddIcon,
                    color: greenFg,
                    bgColor: greenBg,
                    page: <CreateCustomerPage />,
                },
                {
                    nodeId: "/customers",
                    labelText: "Manage Customers",
                    labelIcon: ManageAccounts,
                    color: purpleFg,
                    bgColor: purpleBg,
                    page: <CustomerManagementPage />,
                },
            ],
        },
        {
            nodeId: "invoicesGroup",
            labelText: "Invoices",
            labelIcon: ReceiptIcon,
            color: purpleFg,
            bgColor: purpleBg,
            nodeChildren: [
                {
                    nodeId: "/invoices/create",
                    labelText: "Create New Invoice",
                    labelIcon: PostAddIcon,
                    color: greenFg,
                    bgColor: greenBg,
                    page: <CreateInvoicePage />,
                },
                {
                    nodeId: "/invoices",
                    labelText: "View Completed Invoices",
                    labelIcon: ListAltIcon,
                    color: purpleFg,
                    bgColor: purpleBg,
                    page: <InvoiceManagementPage />,
                },
                {
                    nodeId: "inProgressInvoicesGroup",
                    labelText: "In Progress",
                    labelIcon: PendingActionsIcon,
                    color: blueFg,
                    bgColor: blueBg,
                    nodeChildren: treeInfo.inProgressInvoices.map(({ customerName, invoiceId }) => ({
                        nodeId: `/invoices/inProgress/${invoiceId}`,
                        labelText: customerName,
                        labelIcon: ReceiptIcon,
                        page: <ViewInvoicePage invoiceId={invoiceId} />,
                    })),
                }
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

// DASHBOARD HELPERS TO MAKE IT LESS CLUTTERED

const ensureParentsExpanded = (node, expanded, setExpanded) => {

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

const useDashboardRouting = () => {

    const navigate = useNavigate();

    const windowLocation = useLocation();

    const currURLPath = stripTrailingSlash(windowLocation.pathname);
    const prevURLPath = usePrevious(currURLPath);

    const currURLQueryString = windowLocation.search;
    const prevURLQueryString = usePrevious(currURLQueryString);
    const currURLQuery = queryString.parse(currURLQueryString);

    const routingParams = useParams();

    return { navigate, currURLPath, prevURLPath, currURLQueryString, prevURLQueryString, currURLQuery, routingParams };
}

export const useDataLossWarning = ({ prevURLPath, currURLPath, prevURLQueryString, currURLQueryString }) => {

    const blockExitRef = useRef("");
    const lockExitWith = useCallback((message) => { console.log("exit blocked"); blockExitRef.current = message }, []);
    const unlockExit = useCallback(() => blockExitRef.current = null, []);
    const [triedToSelect, setTriedToSelect] = useState(); // If set, the data loss warning modal will render. Stores config of their failed selection attempt so they can forcefully re-do it by pressing continue

    // Used to be an effect, but effects are called after children render, meaning we would unlockExit after children lock it. unlockExit is a ref so we don't have rendering side effects from changing it here
    if (prevURLPath !== currURLPath || prevURLQueryString !== currURLQueryString) {
        unlockExit(); // Unlock exit if urlPath or queryString have changed. This is so that if the user uses the history arrow keys on their browser to forcefully change the page (skipping the data loss modal), the ref for the modal doesn't stick around
    }

    return { blockExitRef, lockExitWith, unlockExit, triedToSelect, setTriedToSelect }
}
