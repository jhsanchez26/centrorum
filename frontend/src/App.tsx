import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Listings from "./pages/Listings";
import Login from "./pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <header style={{padding:12, display:"flex", gap:12}}>
        <Link to="/">CentroRUM</Link>
        <Link to="/listings">Listings</Link>
        <Link to="/login">Login</Link>
      </header>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/listings" element={<Listings/>}/>
        <Route path="/login" element={<Login/>}/>
      </Routes>
    </BrowserRouter>
  );
}
