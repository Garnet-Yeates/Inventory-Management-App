import { useRef } from "react"

/**
 * 
 * @returns {[any, () => any]}
 */
export const useFocus = () => {

    const focusElementRef = useRef(null)
    const focusElement = () => { focusElementRef.current && focusElementRef.current.focus() }

    return [ focusElementRef, focusElement ] 
}