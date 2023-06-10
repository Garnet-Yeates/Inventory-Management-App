import '../sass/TreeView.scss'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { newAbortSignal } from '../tools/axiosTools'
import axios from 'axios'
import { SERVER_URL } from '../pages/App'
import { TreeItem, TreeView } from '@mui/lab'
import { ArrowDropDown, ArrowRight } from '@mui/icons-material'

let times = 1;
/**
 * My function description.
 * @returns {[Object, () => void]} An array containing an object as the first element and a function as the second element.
 */
export const useGETNavInfo = () => {

    const [navInfo, setNavInfo] = useState({})

    const refreshNavInfoController = useRef(null);

    // This effect does nothing except return a cleanup (on unmount essentially) function that will abort the current controller
    useEffect(() => {
        return () => {
            refreshNavInfoController.current?.abort();
        }
    }, [])

    const refreshNavInfo = useCallback(async () => {

        refreshNavInfoController.current?.abort();

        const controller = newAbortSignal(10);
        refreshNavInfoController.current = controller;

        try {
            let { data } = await axios.get(`${SERVER_URL}/dashboard/navInfo`, { signal: controller.signal })

            // For now we do this
            data = {

                customers: 3,

                invoices: 4,
                inProgressInvoices: [
                    {
                        invoiceId: 1,
                        customerName: "Joe",
                    },
                    {
                        invoiceId: 2,
                        customerName: "Joe",
                    },
                ],

                itemTypes: 22,
                itemInstances: 21,

                stockChanges: 5,
                inProgressStockChanges: [
                    {
                        stockChangeId: 1,
                        date: "11 Jun 2023",
                    },
                    {
                        stockChangeId: 1,
                        date: "11 Jun 2023",
                    },
                ],
            }

            for (let i = 0; i < times; i++) {
                data.inProgressInvoices.push(                    {
                    invoiceId: 1000 + times,
                    customerName: "Jo",
                })
            }
 
            times++;
            setNavInfo(data);
        }
        catch (err) {
            if (axios.isCancel(err)) return console.log("Request canceled due to timeout or unmount", err);
            console.log("Error at GET /dashboard/navInfo", err);
        }
    }, [])

    return ([navInfo, refreshNavInfo]);
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

const RichTreeItem = (props) => {

    const {
        labelText,
        labelIcon: LabelIcon,
        labelInfo,
        color,
        bgColor,
        nodeChildren,
        id,
        onSelected,
        pageLossOnSelect,
        ...other
    } = props;

    return (
        <TreeItem
            id={id}
            label={
                <div className="tree-view-label-root">
                    <LabelIcon color="inherit" className="label-icon" />
                    <span className="label-text">
                        {labelText}
                    </span>
                    <span className="label-info" color="inherit">
                        {labelInfo}
                    </span>
                </div>
            }
            style={{
                "--tree-view-color": color,
                "--tree-view-bg-color": bgColor
            }}
            {...other}
        >
            {nodeChildren && nodeChildren.map(child => {
                return <RichTreeItem key={child.nodeId} {...child} />
            })}
        </TreeItem>
    )
}