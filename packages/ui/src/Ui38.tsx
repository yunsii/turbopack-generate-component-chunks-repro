import { tag7 } from '../../../shared/util7'
import { useState } from 'react'
export function Ui38() { const [n,setN]=useState(0); return <span data-ui="38" onClick={()=>setN(n+1)}>Ui38 {tag7} {n}</span> }
