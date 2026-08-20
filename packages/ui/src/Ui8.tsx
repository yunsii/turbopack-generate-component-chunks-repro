import { tag1 } from '../../../shared/util1'
import { useState } from 'react'
export function Ui8() { const [n,setN]=useState(0); return <span data-ui="8" onClick={()=>setN(n+1)}>Ui8 {tag1} {n}</span> }
