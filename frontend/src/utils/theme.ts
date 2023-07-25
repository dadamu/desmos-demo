// A custom theme for this app
import {createTheme} from "@mui/material";
import {red} from "@mui/material/colors";

const theme = createTheme({
  typography: {
    allVariants: {
      wordBreak: "break-word"
    }
  },
  palette: {
    primary: {
      main: '#ED6C53',
    },
    secondary: {
      main: '#fff',
    },
    error: {
      main: red.A400,
    },
    background: {
      default: '#fff',
    },
  },
  spacing: 10,
});

export default theme;
