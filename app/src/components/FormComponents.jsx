import { FormControl, FormHelperText, InputAdornment, InputLabel, MenuItem, OutlinedInput, Select, TextField } from "@mui/material";

// All of these are built upon the MaterialUI library

const integerRegex = /^(?:\d+|)$/
const decimalRegex = /^-?(?:\d+(?:\.\d*)?|\.\d+)?$/;

const getRegexForType = (type) => {
    switch (type) {
        case "text":
            return null;
        case "number":
            return decimalRegex;
        case "integer":
            return integerRegex;
    }
}

const getOnChangeFunction = (type, state, setState) => {
    const regex = getRegexForType(type);
    return ({ target: { value } }) => {
        if (type === "number" && value.startsWith('.'))
            value = "0" + value;
        if (regex && !regex.exec(value))
            return;
        setState && setState(value);
    }
}

export const FormSelectInput = (props) => {

    const {
        sx,
        className,
        fullWidth,
        disabled,
        label,
        helperText, errorText, minHelperText,
        values,
        size,
        displayToValueMap,
        displayNullOption = true,
        value, onChange, setState, // setState or onChange should be defined, not both
        nullOptionText = "None"
    } = props;

    if (!setState && !onChange) {
        throw new Error("setState or onChange must be defined.")
    }
    else if (setState && onChange) {
        throw new Error("Can not use setState an onChange. Use one or the other.")
    }

    let displays;

    if (values) {
        if (displayToValueMap) {
            throw new Error("Values and valueMap cannot both be supplied")
        }
        displays = values;
    }
    else if (displayToValueMap) {
        displays = Object.keys(displayToValueMap);
        values = Object.values(displayToValueMap);
    }
    else {
        throw new Error("Values or valueMap must be supplied")
    }

    const errored = errorText ? true : false;
    
    return (
        <FormControl sx={sx} disabled={disabled} error={errored} fullWidth={fullWidth} size={size}>
            <InputLabel>{label}</InputLabel>
            <Select
                className={className}
                size={size}
                value={value ?? ""}
                onChange={onChange ? onChange : (e) => setState(e.target.value)}
                label={label}
                disabled={disabled}
            >
                {displayNullOption && <MenuItem><em>{nullOptionText}</em></MenuItem>}
                {values.map((value, index) => <MenuItem value={value}>{displays[index]}</MenuItem>)}
            </Select>
            <FormHelperText error={errored}>{errorText || helperText || (minHelperText ? "" : " ")}</FormHelperText>
        </FormControl>
    )
}

export const AdornedFormInput = (props) => {
    
    const { 
        label, 
        size, 
        fullWidth, 
        adornment, 
        type, 
        helperText, errorText, minHelperText, 
        disabled, 
        value, onChange, setState,
        ...rest
    } = props;

    if (!setState && !onChange) {
        throw new Error("setState or onChange must be defined.")
    }
    else if (setState && onChange) {
        throw new Error("Can not use setState an onChange. Use one or the other.")
    }
    
    const errored = errorText ? true : false;

    return (
        <FormControl disabled={disabled} size={size} fullWidth={fullWidth} error={errored} variant="outlined">
            <InputLabel size={size} error={errored} variant="outlined">{label}</InputLabel>
            <OutlinedInput
                disabled={disabled}
                size={size}
                error={errored}
                value={value ?? ""}
                onChange={onChange ?? getOnChangeFunction(type, value, setState)}
                label={label}
                startAdornment={<InputAdornment position="start">{adornment}</InputAdornment>}
                {...rest}
            />
            <FormHelperText error={errored}>{errorText || helperText || (minHelperText ? "" : " ")}</FormHelperText>
        </FormControl>
    )
}

export const FormInput = (props) => {
    
    const { 
        type, 
        errorText, helperText, minHelperText, 
        value, onChange, setState,
        ...rest 
    } = props;

    if (!setState && !onChange) {
        throw new Error("setState or onChange must be defined.")
    }
    else if (setState && onChange) {
        throw new Error("Can not use setState an onChange. Use one or the other.")
    }
    
    return (
        <TextField
            value={value ?? ""}
            onChange={onChange ?? getOnChangeFunction(type, value, setState)}
            error={errorText ? true : false}
            helperText={errorText || helperText || (minHelperText ? "" : " ")}
            {...rest}
        />
    )
}