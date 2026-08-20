import { tag7 } from '../../../shared/util7'
import { useState } from 'react'
export function Ui14() { const [n,setN]=useState(0); return <span data-ui="14" onClick={()=>setN(n+1)}>Ui14 {tag7} {n}</span> }
