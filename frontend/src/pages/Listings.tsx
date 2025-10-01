import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Listing = { id:number; title:string; description:string; org_name:string; type:string; modality:string; rsvp_count:number };

export default function Listings() {
  const [items,setItems] = useState<Listing[]>([]);
  useEffect(() => { api.get("/listings/").then(r => setItems(r.data)); }, []);
  return (
    <main style={{padding:16}}>
      <h1>Listings</h1>
      <ul>
        {items.map(x => (
          <li key={x.id} style={{margin:"12px 0"}}>
            <strong>{x.title}</strong> — {x.org_name} [{x.type}/{x.modality}] • RSVPs: {x.rsvp_count}
            <div>{x.description}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
