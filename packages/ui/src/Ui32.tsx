import { tag1 } from '../../../shared/util1'
import { useState } from 'react'
export function Ui32() { const [n,setN]=useState(0); return <span data-ui="32" onClick={()=>setN(n+1)}>Ui32 {tag1} {n}</span> }
