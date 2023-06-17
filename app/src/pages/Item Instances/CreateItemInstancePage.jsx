// Used for creating new Item Types. No way to edit 'in-progress' ones since creation is very simple

import { useNavigate } from "react-router-dom";

const CreateItemInstancePage = (props) => {

    const { selectNodeNextRefresh, refreshNavInfo } = props;

    const onClick = () => {
        selectNodeNextRefresh("createNewCustomer");
        refreshNavInfo();
    }

    return (
        <div>
            Create Item Instance Page
            <button onClick={onClick}>SELECT CREATE CUST</button>
        </div>
    )

}

export default CreateItemInstancePage;