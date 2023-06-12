import { TreeItem } from "@mui/lab";

const RichTreeItem = (props) => {

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
                "--active-color": "var(--inactive-color)",
                "--active-bg-color": "var(--inactive-bg-color)"
            }}
        >
            {nodeChildren && nodeChildren.map(child => {
                return <RichTreeItem key={child.nodeId} {...child} />
            })}
        </TreeItem>
    )
}

export default RichTreeItem;