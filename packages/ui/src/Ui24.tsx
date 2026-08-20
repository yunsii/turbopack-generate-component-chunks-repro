import { tag1 } from '../../../shared/util1'
import { useState } from 'react'
export function Ui24() { const [n,setN]=useState(0); return <span data-ui="24" onClick={()=>setN(n+1)}>Ui24 {tag1} {n}</span> }
