import { useState } from "react";
import { api, setToken } from "../lib/api";

export default function Login() {
  const [u,setU] = useState(""); const [p,setP] = useState("");
  async function onSubmit(e:React.FormEvent) {
    e.preventDefault();
    const { data } = await api.post("/auth/token/", { username:u, password:p });
    setToken(data.access); localStorage.setItem("token", data.access);
    alert("Logged in!");
  }
  return (
    <form onSubmit={onSubmit} style={{padding:16, display:"grid", gap:8, maxWidth:320}}>
      <input placeholder="username" value={u} onChange={e=>setU(e.target.value)} />
      <input placeholder="password" type="password" value={p} onChange={e=>setP(e.target.value)} />
      <button>Sign in</button>
    </form>
  );
}
