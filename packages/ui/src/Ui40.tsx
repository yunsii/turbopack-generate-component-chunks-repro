import { tag1 } from '../../../shared/util1'
import { useState } from 'react'
export function Ui40() { const [n,setN]=useState(0); return <span data-ui="40" onClick={()=>setN(n+1)}>Ui40 {tag1} {n}</span> }
