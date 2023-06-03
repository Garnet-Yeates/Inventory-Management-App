import axios from "axios";
import { useEffect, useRef } from "react";

export function newAbortSignal(timeoutS = 0) {
    const abortController = new AbortController();
    setTimeout(() => abortController.abort(), timeoutS * 1000);

    return abortController;
}

// NOTE callbacks input into these must be memoized with useCallback(() => ...., [deps])

/**
 * @param {string} url
 * @param {*} url
 * @param {{onFetched: function, onCanceled: function, onError: function }} callbacks 
 * @param {AxiosRequestConfig} config
 */
export function useMountPOST(url, data, callbacks, config = {}) {
    useMountFetch("POST", url, data, callbacks, config);
}

/**
 * @param {string} url
 * @param {{onFetched: function, onCanceled: function, onError: function }} callbacks 
 * @param {AxiosRequestConfig} config
 */
export function useMountGET(url, callbacks, config = {}) {
    useMountFetch("GET", url, undefined, callbacks, config);
}

function useMountFetch(type, url, data = undefined, { onFetched, onCanceled, onError }, config = {}) {

    if (type !== "GET" && type !== "POST") {
        throw new Error();
    }

    useEffect(() => {

        const controller = newAbortSignal(5);
        let mounted = true;

        async function getData() {
            try {
                const axiosConfig = { signal: controller.signal, ...config };
                let response;
                if (type === "GET") response = await axios.get(url, axiosConfig);
                if (type === "POST") response = await axios.post(url, data, axiosConfig)
                mounted && onFetched && onFetched(response)
            }
            catch (err) {

                // This runs when cleanup gets called and the controller aborted causing a 'canceled error'
                if (!mounted) {
                    return void console.log("useMountFetch: component is no longer mounted so the following error is ignored", err)
                }

                // This runs when a canceled error occurs from controller.abort, but not from our cleanup function (i.e, timed out)
                if (axios.isCancel(err) && onCanceled) {
                    return void onCanceled(err);
                }

                // Basic error case
                onError && onError(err);
            }
        }

        getData();

        return function cleanup() {
            mounted = false;
            controller.abort();
        }

    }, [url, data, onFetched, onCanceled, onError, type, config])
}

// Example: const isMounted = useIsMounted();
export function useIsMounted() {

    const mountRef = useRef();

    useEffect(() => {

        mountRef.current = true;

        return function cleanup() {
            mountRef.current = false;
        }

    }, [mountRef])

    return mountRef.current;
}