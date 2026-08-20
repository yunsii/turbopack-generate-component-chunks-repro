import { tag1 } from '../../../shared/util1'
import { useState } from 'react'
export function Ui16() { const [n,setN]=useState(0); return <span data-ui="16" onClick={()=>setN(n+1)}>Ui16 {tag1} {n}</span> }
