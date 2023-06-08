import { useEffect, useMemo, useRef, useState } from "react"
import "../sass/DashboardPage.scss"
import { FixedMobileBar, NavigationPanel, useGETNavInfo } from "../components/WebsiteNavigation.jsx";
import ViewInvoicePage from '../pages/Invoices/ViewInvoicePage'
import InvoiceManagementPage from '../pages/Invoices/InvoiceManagementPage'
import CreateInvoicePage from '../pages/Invoices/CreateInvoicePage'
import CustomerManagementPage from '../pages/Customer/CustomerManagementPage'
import CreateCustomerPage from '../pages/Customer/CreateCustomerPage'
import DeleteIcon from '@material-ui/icons/Delete'

export default function DashboardPage() {

    const [currentPage, setCurrentPage] = useState();

    const [navInfo, refreshNavInfo] = useGETNavInfo();

    // An array of objects describing RichTreeItem components to be passed to <NavigationPanel>
    // Updated whenever navInfo changes. Note that navInfo is a state variable so when it changes, a re-render occurs here
    const dashboardTreeItems = useMemo(() => getDashboardTreeItemsFromNavInfo(navInfo, setCurrentPage), [navInfo])

    // Refresh nav info on mount
    useEffect(() => void refreshNavInfo(), [refreshNavInfo]);

    let jsx;
    let additionalProps = { setCurrentPage }
    let CurrentPage = currentPage?.type;

    if (currentPage)
        jsx = <CurrentPage {...currentPage.props} {...additionalProps} />
    else
        jsx = <DashboardContent {...additionalProps} />

    return (
        <div className="general-page-container">
            <div className="general-page">
                <div className="responsive-page-container">
                    <FixedMobileBar navInfo={dashboardTreeItems} />
                    <NavigationPanel treeItems={dashboardTreeItems} />
                    {jsx}
                </div>
            </div>
        </div>
    )
}

const DashboardContent = () => {

    const def = useRef(0);

    useEffect(() => {
        console.log("def", def.current++);
    }, [])

    return (
        <div className="dashboard-page">
            DASH
        </div>
    )
}

const getDashboardTreeItemsFromNavInfo = (navInfo, setCurrentPage) => {

    if (Object.keys(navInfo).length === 0) {
        return [];
    }

    let nodeId = 0;

    function getId() {
        return String(nodeId++);
    }
    // Map response.data to RichTreeItem props
    return [
        {
            nodeId: getId(),
            labelText: "Customers",
            labelIcon: DeleteIcon,
            color: "#1a73e8",
            bgColor: "#e8f0fe",
            labelInfo: navInfo.customers,
            nodeChildren: [
                {
                    nodeId: getId(),
                    labelText: "Create New",
                    labelIcon: DeleteIcon,
                    color: "#1a73e8",
                    bgColor: "#e8f0fe",
                    onClick: () => setCurrentPage(<CreateCustomerPage />),
                },
                {
                    nodeId: getId(),
                    labelText: "View All",
                    labelIcon: DeleteIcon,
                    color: "#1a73e8",
                    bgColor: "#e8f0fe",
                    onClick: () => setCurrentPage(<CustomerManagementPage />),
                }
            ]
        },
        {
            nodeId: getId(),
            labelText: "Invoices",
            labelIcon: DeleteIcon,
            color: "#1a73e8",
            bgColor: "#e8f0fe",
            labelInfo: navInfo.invoices,
            nodeChildren: [
                {
                    nodeId: getId(),
                    labelText: "Create New",
                    labelIcon: DeleteIcon,
                    color: "#1a73e8",
                    bgColor: "#e8f0fe",
                    onClick: () => setCurrentPage(<CreateInvoicePage />),
                },
                {
                    nodeId: getId(),
                    labelText: "View All",
                    labelIcon: DeleteIcon,
                    color: "#1a73e8",
                    bgColor: "#e8f0fe",
                    onClick: () => setCurrentPage(<InvoiceManagementPage />),
                },
                {
                    nodeId: getId(),
                    labelText: "In Progress",
                    labelIcon: DeleteIcon,
                    color: "#1a73e8",
                    bgColor: "#e8f0fe",
                    labelInfo: navInfo.inProgressInvoices.length,
                    nodeChildren: navInfo.inProgressInvoices.map(({ customerName, invoiceId }) => ({
                        nodeId: getId(),
                        labelText: customerName,
                        labelIcon: DeleteIcon,
                        color: "#1a73e8",
                        bgColor: "#e8f0fe",
                        onClick: () => setCurrentPage(<ViewInvoicePage invoiceId={invoiceId} />)
                    }))
                }
            ]
        }

    ]
}