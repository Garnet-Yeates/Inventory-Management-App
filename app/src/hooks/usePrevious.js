import { useEffect, useRef } from "react";

const usePrevious = (stateOrProp) => {
    const prevRef = useRef();
    useEffect(() => {
        prevRef.current = stateOrProp;
    }, [stateOrProp])
    return prevRef.current;
}

export default usePrevious;