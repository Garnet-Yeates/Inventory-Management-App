import { ArrowDropDown, ArrowRight } from "@mui/icons-material";
import { TreeItem, TreeView } from "@mui/lab";
import React from "react";

const RichTreeView = ({ treeItems, ...treeViewProps }) => {

    const collapseIcon = <ArrowDropDown className="tree-view-icon" />
    const expandIcon = <ArrowRight className="tree-view-icon" />

    return (
        <TreeView
            {...treeViewProps}
            defaultCollapseIcon={collapseIcon}
            defaultExpandIcon={expandIcon}>
            {treeItems.map(info => <RichTreeItem key={info.nodeId} {...info} />)}
        </TreeView>
    )
}

export const RichTreeItem = (props) => {

    const {
        labelText,
        labelIcon: LabelIcon,
        labelInfo,
        color,
        bgColor,
        nodeChildren,
        nodeId,
    } = props;

    return (
        <TreeItem
            nodeId={nodeId}
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
                "--active-color": color,
                "--active-bg-color": bgColor,
            }}
        >
            {nodeChildren && nodeChildren.map(child => {
                return <RichTreeItem key={child.nodeId} {...child} />
            })}
        </TreeItem>
    )
}

export default React.memo(RichTreeView);