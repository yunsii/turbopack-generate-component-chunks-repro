import { tag8 } from '../../../shared/util8'
import { useState } from 'react'
export function Ui23() { const [n,setN]=useState(0); return <span data-ui="23" onClick={()=>setN(n+1)}>Ui23 {tag8} {n}</span> }
