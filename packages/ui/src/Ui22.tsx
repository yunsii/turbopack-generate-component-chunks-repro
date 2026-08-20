import { tag7 } from '../../../shared/util7'
import { useState } from 'react'
export function Ui22() { const [n,setN]=useState(0); return <span data-ui="22" onClick={()=>setN(n+1)}>Ui22 {tag7} {n}</span> }
