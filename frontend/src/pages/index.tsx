import Grid2 from "@mui/material/Unstable_Grid2";

export default function Home() {
  return <Grid2
    sx={{ m: 2 }}
    container
    direction={"column"}
    alignItems={"center"}
  >
    <h1>Hello, Desmos!</h1>
    <h3>Connect your wallet first, please.</h3>
  </Grid2>
}