// Used for creating new Item Types. No way to edit 'in-progress' ones since creation is very simple

import { useNavigate } from "react-router-dom";

const CreateItemInstancePage = (props) => {

    const { selectNodeNextRefresh, refreshNavInfo } = props;

    return (
        <div className="overview-sub-page">
            <h2 className="sub-page-heading">Create Item Instance Page (TODO)</h2>
        </div>
    )

}

export default CreateItemInstancePage;