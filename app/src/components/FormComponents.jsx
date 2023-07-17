import { FormControl, FormHelperText, InputAdornment, InputLabel, OutlinedInput, TextField } from "@mui/material";

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

export const AdornedFormInput = ({ label, size, state, setState, fullWidth, adornment, type, helperText, errorText, minErrorText, disabled, placeholder, value, onChange }) => {
    const error = errorText ? true : false;
    return (
        <FormControl size={size} error={error} fullWidth={fullWidth} variant="outlined">
            <InputLabel size={size} error={error} variant="outlined">{label}</InputLabel>
            <OutlinedInput
                disabled={disabled}
                placeholder={placeholder}
                size={size}
                error={error}
                value={value ?? state}
                onChange={onChange ?? getOnChangeFunction(type, state, setState)}
                label={label}
                startAdornment={<InputAdornment position="start">{adornment}</InputAdornment>}
            />
            <FormHelperText error={error}>{errorText || helperText || (minErrorText ? "" : " ")}</FormHelperText>
        </FormControl>
    )
}

export const FormInput = ({ state, setState, type, errorText, helperText, minErrorText, onChange, value, ...rest }) => {
    return (
        <TextField
            value={value ?? state}
            onChange={onChange ?? getOnChangeFunction(type, state, setState)}
            error={errorText ? true : false}
            helperText={errorText || helperText || (minErrorText ? "" : " ")}
            {...rest}
        />
    )
}