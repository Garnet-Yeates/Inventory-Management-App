export default function StatefulInput({ className, state, setState, type }) {
    if (type !== "password" && type !== "text") throw new Error("");
    const onChange = (event) => setState(event.target.value)
    return <input className={className} type={type} value={state} onChange={onChange} />
}