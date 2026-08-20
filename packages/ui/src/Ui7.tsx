import { tag8 } from '../../../shared/util8'
import { useState } from 'react'
export function Ui7() { const [n,setN]=useState(0); return <span data-ui="7" onClick={()=>setN(n+1)}>Ui7 {tag8} {n}</span> }
